/**
 * CloudFormation Custom Resource Lambda handler for LakeFormation Administrator setup.
 *
 * This handler adds additional administrators to AWS Lake Formation settings.
 */
import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  Context,
} from "aws-lambda";
import {
  LakeFormationClient,
  GetDataLakeSettingsCommand,
  PutDataLakeSettingsCommand,
  DataLakePrincipal,
} from "@aws-sdk/client-lakeformation";
import { IAMClient, GetRoleCommand } from "@aws-sdk/client-iam";
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
 * Validates that a role ARN exists.
 */
async function validateRoleExists(iam: IAMClient, roleArn: string): Promise<boolean> {
  try {
    const roleName = roleArn.split("/").pop()!;
    await iam.send(new GetRoleCommand({ RoleName: roleName }));
    return true;
  } catch (error: any) {
    if (error.name === "NoSuchEntityException") {
      return false;
    }
    throw error;
  }
}

/**
 * Lambda handler for LakeFormation Administrator setup.
 */
export async function handler(
  event: CloudFormationCustomResourceEvent,
  _context: Context
): Promise<CloudFormationCustomResourceResponse> {
  try {
    console.log("LakeFormation Admin Custom Resource Event received", JSON.stringify(event));

    const { RequestType, ResourceProperties } = event;
    const { DataLakeAdmins } = ResourceProperties;

    const lakeFormation = new LakeFormationClient({});
    const iam = new IAMClient({});

    const physicalResourceId = `lakeformation-admins-${Date.now()}`;

    if (RequestType === "Create" || RequestType === "Update") {
      console.log("Setting up LakeFormation administrators", { admins: DataLakeAdmins });

      // Validate all role ARNs exist
      for (const roleArn of DataLakeAdmins) {
        const exists = await validateRoleExists(iam, roleArn);
        if (!exists) {
          throw new Error(`Role does not exist: ${roleArn}`);
        }
      }

      // Get current settings
      const currentSettings = await lakeFormation.send(new GetDataLakeSettingsCommand({}));

      // Get existing admins (excluding the ones we're adding to avoid duplicates)
      const existingAdmins =
        currentSettings.DataLakeSettings?.DataLakeAdmins?.filter(
          (admin) => !DataLakeAdmins.includes(admin.DataLakePrincipalIdentifier)
        ) || [];

      // Merge with new admins
      const allAdmins: DataLakePrincipal[] = [
        ...existingAdmins,
        ...DataLakeAdmins.map((arn: string) => ({ DataLakePrincipalIdentifier: arn })),
      ];

      // Update settings
      await lakeFormation.send(
        new PutDataLakeSettingsCommand({
          DataLakeSettings: {
            ...currentSettings.DataLakeSettings,
            DataLakeAdmins: allAdmins,
          },
        })
      );

      console.log("LakeFormation administrators updated successfully", { admins: allAdmins });

      const physicalId = "PhysicalResourceId" in event ? event.PhysicalResourceId : physicalResourceId;

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: physicalId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {
          AdminCount: allAdmins.length,
        },
      };

      await sendResponse(event, response);
      return response;
    } else if (RequestType === "Delete") {
      console.log("Removing LakeFormation administrators", { admins: DataLakeAdmins });

      try {
        // Get current settings
        const currentSettings = await lakeFormation.send(new GetDataLakeSettingsCommand({}));

        // Remove the admins we added
        const remainingAdmins =
          currentSettings.DataLakeSettings?.DataLakeAdmins?.filter(
            (admin) => !DataLakeAdmins.includes(admin.DataLakePrincipalIdentifier)
          ) || [];

        // Update settings
        await lakeFormation.send(
          new PutDataLakeSettingsCommand({
            DataLakeSettings: {
              ...currentSettings.DataLakeSettings,
              DataLakeAdmins: remainingAdmins,
            },
          })
        );

        console.log("LakeFormation administrators removed successfully");
      } catch (error) {
        console.log("Error during cleanup (continuing anyway)", error);
      }

      const response = {
        Status: "SUCCESS" as const,
        PhysicalResourceId: event.PhysicalResourceId,
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
      "PhysicalResourceId" in event
        ? event.PhysicalResourceId
        : `failed-${event.LogicalResourceId}-${Date.now()}`;

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
