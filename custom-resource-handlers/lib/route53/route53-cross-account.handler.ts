/**
 * CloudFormation Custom Resource Lambda handler for Route53 record management with cross-account access.
 *
 * This handler manages Route53 DNS records when the records need to be created in a hosted zone
 * that exists in a different AWS account. It handles record creation, updates, and deletion
 * by assuming a cross-account IAM role.
 */
import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  Context,
} from "aws-lambda";
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand,
  ChangeAction,
  type ResourceRecordSet,
} from "@aws-sdk/client-route-53";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import https from "https";
import { URL } from "url";

/**
 * Sends response back to CloudFormation for custom resource operations.
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
 * Lambda handler for Route53 record management with cross-account access.
 */
export async function handler(
  event: CloudFormationCustomResourceEvent,
  _context: Context
): Promise<CloudFormationCustomResourceResponse> {
  try {
    console.log("Route53 Record Custom Resource Event received", JSON.stringify(event));

    const { RequestType, ResourceProperties } = event;
    const { HostedZoneId, Name, Type, ResourceRecords, AliasTarget, TTL, Route53RoleArn } =
      ResourceProperties;

    console.log("Processing request", { RequestType, Name, Type, ResourceRecords, AliasTarget });

    // Assume cross-account role
    console.log("Assuming cross-account role", { roleArn: Route53RoleArn });
    const sts = new STSClient({});
    const assumeRoleResult = await sts.send(
      new AssumeRoleCommand({
        RoleArn: Route53RoleArn,
        RoleSessionName: "Route53RecordManagement",
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

    const recordId = `${HostedZoneId}:${Name}:${Type}`;

    if (RequestType === "Create" || RequestType === "Update") {
      console.log("Creating/updating DNS record", { name: Name, type: Type });

      const resourceRecordSet: ResourceRecordSet = {
        Name,
        Type,
      } as ResourceRecordSet;

      if (AliasTarget && AliasTarget !== "undefined") {
        resourceRecordSet.AliasTarget = AliasTarget;
      } else if (ResourceRecords && ResourceRecords.length > 0) {
        resourceRecordSet.TTL = parseInt(TTL || "300");
        resourceRecordSet.ResourceRecords = ResourceRecords.map((value: string) => ({
          Value: value,
        }));
      } else {
        throw new Error("Either AliasTarget or ResourceRecords must be provided");
      }

      const changeBatch = {
        Changes: [
          {
            Action: ChangeAction.UPSERT,
            ResourceRecordSet: resourceRecordSet,
          },
        ],
      };

      await route53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId,
          ChangeBatch: changeBatch,
        })
      );

      console.log("DNS record created/updated successfully", { name: Name });

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: recordId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: { RecordName: Name, RecordType: Type },
      };

      await sendResponse(event, response);
      return response;
    } else if (RequestType === "Delete") {
      const physicalResourceId = event.PhysicalResourceId;
      console.log("Starting DNS record cleanup", { physicalResourceId });

      if (!physicalResourceId || physicalResourceId.startsWith("failed-")) {
        console.log("Skipping cleanup - no valid record ID found");
        const response = {
          Status: "SUCCESS" as const,
          PhysicalResourceId: physicalResourceId,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
        };

        await sendResponse(event, response);
        return response;
      }

      try {
        // Check if record exists before attempting to delete
        const listResult = await route53.send(
          new ListResourceRecordSetsCommand({
            HostedZoneId,
            StartRecordName: Name,
            StartRecordType: Type,
            MaxItems: 1,
          })
        );

        const recordExists = listResult.ResourceRecordSets?.some(
          (record) => record.Name === Name && record.Type === Type
        );

        if (recordExists) {
          console.log("Deleting DNS record", { name: Name, type: Type });

          const deleteResourceRecordSet: ResourceRecordSet = {
            Name,
            Type,
          } as ResourceRecordSet;

          if (AliasTarget && AliasTarget !== "undefined") {
            deleteResourceRecordSet.AliasTarget = AliasTarget;
          } else if (ResourceRecords && ResourceRecords.length > 0) {
            deleteResourceRecordSet.TTL = parseInt(TTL || "300");
            deleteResourceRecordSet.ResourceRecords = ResourceRecords.map((value: string) => ({
              Value: value,
            }));
          }

          const changeBatch = {
            Changes: [
              {
                Action: ChangeAction.DELETE,
                ResourceRecordSet: deleteResourceRecordSet,
              },
            ],
          };

          await route53.send(
            new ChangeResourceRecordSetsCommand({
              HostedZoneId,
              ChangeBatch: changeBatch,
            })
          );

          console.log("DNS record deleted successfully", { name: Name });
        } else {
          console.log("DNS record does not exist, skipping deletion", { name: Name });
        }
      } catch (error) {
        console.error("Error during DNS record cleanup", error);
      }

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: physicalResourceId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
      };

      await sendResponse(event, response);
      return response;
    }

    // Should not reach here
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
      console.log("Sending error response", JSON.stringify(response));
      await sendResponse(event, response);
    } catch (sendError) {
      console.error("Failed to send error response to CloudFormation", sendError);
    }

    return response;
  }
}
