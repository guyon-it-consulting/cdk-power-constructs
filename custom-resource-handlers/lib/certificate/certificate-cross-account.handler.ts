/**
 * CloudFormation Custom Resource Lambda handler for ACM certificate with cross-account DNS validation.
 *
 * This handler creates ACM certificates and manages DNS validation records in a Route53 hosted zone
 * that exists in a different AWS account.
 */
import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  Context,
} from "aws-lambda";
import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
  DeleteCertificateCommand,
} from "@aws-sdk/client-acm";
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ChangeAction,
} from "@aws-sdk/client-route-53";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import https from "https";
import { URL } from "url";

/**
 * Sends response back to CloudFormation.
 */
async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  response: CloudFormationCustomResourceResponse
): Promise<void> {
  const responseBody = JSON.stringify(response);
  const parsedUrl = new URL(event.ResponseURL);

  console.log("Sending response to CloudFormation", JSON.stringify(response));

  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "PUT",
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log("CloudFormation response received", { statusCode: res.statusCode });
      resolve();
    });

    req.on("error", (error) => {
      console.error("Error sending response to CloudFormation", error);
      reject(error);
    });

    req.write(responseBody);
    req.end();
  });
}

/**
 * Wait for certificate to have validation options available.
 */
async function waitForValidationOptions(
  acm: ACMClient,
  certificateArn: string,
  maxAttempts = 30,
  delayMs = 2000
): Promise<{ name: string; type: string; value: string }[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const describeResult = await acm.send(
      new DescribeCertificateCommand({ CertificateArn: certificateArn })
    );

    const options = describeResult.Certificate?.DomainValidationOptions;
    if (options && options.length > 0 && options[0].ResourceRecord) {
      return options.map((opt) => ({
        name: opt.ResourceRecord!.Name!,
        type: opt.ResourceRecord!.Type!,
        value: opt.ResourceRecord!.Value!,
      }));
    }

    console.log(`Waiting for validation options (attempt ${attempt + 1}/${maxAttempts})...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Timeout waiting for certificate validation options");
}

/**
 * Lambda handler for ACM certificate with cross-account DNS validation.
 */
export async function handler(
  event: CloudFormationCustomResourceEvent,
  _context: Context
): Promise<CloudFormationCustomResourceResponse> {
  try {
    console.log("Certificate Custom Resource Event received", JSON.stringify(event));

    const { RequestType, ResourceProperties } = event;
    const {
      DomainName,
      SubjectAlternativeNames,
      CertificateTransparencyLoggingPreference,
      KeyAlgorithm,
      Route53RoleArn,
      HostedZoneId,
    } = ResourceProperties;

    const acm = new ACMClient({});

    // Get cross-account Route53 client
    console.log("Assuming cross-account role", { roleArn: Route53RoleArn });
    const sts = new STSClient({});
    const assumeRoleResult = await sts.send(
      new AssumeRoleCommand({
        RoleArn: Route53RoleArn,
        RoleSessionName: "CertificateDnsValidation",
      })
    );

    const credentials = assumeRoleResult.Credentials!;
    const route53 = new Route53Client({
      credentials: {
        accessKeyId: credentials.AccessKeyId!,
        secretAccessKey: credentials.SecretAccessKey!,
        sessionToken: credentials.SessionToken!,
      },
    });

    console.log("Cross-account role assumed successfully");

    if (RequestType === "Create") {
      console.log("Creating certificate", { domainName: DomainName });

      // Request certificate
      const requestResult = await acm.send(
        new RequestCertificateCommand({
          DomainName,
          SubjectAlternativeNames,
          ValidationMethod: "DNS",
          Options: CertificateTransparencyLoggingPreference
            ? { CertificateTransparencyLoggingPreference }
            : undefined,
          KeyAlgorithm,
        })
      );

      const certificateArn = requestResult.CertificateArn!;
      console.log("Certificate requested", { certificateArn });

      // Wait for validation options
      const validationRecords = await waitForValidationOptions(acm, certificateArn);
      console.log("Validation records received", { validationRecords });

      // Create DNS validation records in cross-account hosted zone
      for (const record of validationRecords) {
        console.log("Creating DNS validation record", record);

        await route53.send(
          new ChangeResourceRecordSetsCommand({
            HostedZoneId,
            ChangeBatch: {
              Changes: [
                {
                  Action: ChangeAction.UPSERT,
                  ResourceRecordSet: {
                    Name: record.name,
                    Type: record.type as "CNAME",
                    TTL: 300,
                    ResourceRecords: [{ Value: record.value }],
                  },
                },
              ],
            },
          })
        );
      }

      console.log("DNS validation records created");

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: certificateArn,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {
          CertificateArn: certificateArn,
        },
      };

      await sendResponse(event, response);
      return response;
    } else if (RequestType === "Update") {
      // For updates, we need to create a new certificate
      // ACM certificates cannot be updated, only replaced
      console.log("Update requested - certificates cannot be updated, returning existing");

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: event.PhysicalResourceId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {
          CertificateArn: event.PhysicalResourceId,
        },
      };

      await sendResponse(event, response);
      return response;
    } else if (RequestType === "Delete") {
      const certificateArn = event.PhysicalResourceId;
      console.log("Deleting certificate", { certificateArn });

      if (!certificateArn || certificateArn.startsWith("failed-")) {
        console.log("Skipping cleanup - no valid certificate ARN");
        const response = {
          Status: "SUCCESS" as const,
          PhysicalResourceId: certificateArn,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
        };

        await sendResponse(event, response);
        return response;
      }

      try {
        // Get validation records to delete them
        const describeResult = await acm.send(
          new DescribeCertificateCommand({ CertificateArn: certificateArn })
        );

        const options = describeResult.Certificate?.DomainValidationOptions;
        if (options) {
          for (const opt of options) {
            if (opt.ResourceRecord) {
              console.log("Deleting DNS validation record", opt.ResourceRecord);

              try {
                await route53.send(
                  new ChangeResourceRecordSetsCommand({
                    HostedZoneId,
                    ChangeBatch: {
                      Changes: [
                        {
                          Action: ChangeAction.DELETE,
                          ResourceRecordSet: {
                            Name: opt.ResourceRecord.Name!,
                            Type: opt.ResourceRecord.Type! as "CNAME",
                            TTL: 300,
                            ResourceRecords: [{ Value: opt.ResourceRecord.Value! }],
                          },
                        },
                      ],
                    },
                  })
                );
              } catch (dnsError) {
                console.log("DNS record deletion failed (may not exist)", dnsError);
              }
            }
          }
        }

        // Wait a bit for certificate to be unused
        const maxDeleteAttempts = 10;
        for (let attempt = 0; attempt < maxDeleteAttempts; attempt++) {
          try {
            await acm.send(new DeleteCertificateCommand({ CertificateArn: certificateArn }));
            console.log("Certificate deleted successfully");
            break;
          } catch (deleteError: any) {
            if (deleteError.name === "ResourceInUseException" && attempt < maxDeleteAttempts - 1) {
              console.log(`Certificate still in use, waiting (attempt ${attempt + 1})...`);
              await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
              throw deleteError;
            }
          }
        }
      } catch (error) {
        console.log("Error during cleanup (continuing anyway)", error);
      }

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: certificateArn,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
      };

      await sendResponse(event, response);
      return response;
    }

    throw new Error(`Unsupported request type: ${RequestType}`);
  } catch (error) {
    console.error("Handler error", error);

    const physicalResourceId =
      (event as CloudFormationCustomResourceEvent & { PhysicalResourceId?: string })
        .PhysicalResourceId || `failed-${event.LogicalResourceId}-${Date.now()}`;

    let errorMessage = "UnknownError";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response = {
      Status: "FAILED" as const,
      Reason: errorMessage,
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    };

    try {
      await sendResponse(event, response);
    } catch (sendError) {
      console.error("Failed to send error response", sendError);
    }

    return response;
  }
}
