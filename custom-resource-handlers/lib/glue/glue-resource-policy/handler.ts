import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { Glue, EnableHybridValues } from '@aws-sdk/client-glue';

const glue = new Glue({});

interface ResourceProperties {
  Sid: string;
  Statement: string;
  EnableHybrid?: string | boolean;
}

interface PolicyDocument {
  Version: string;
  Statement: Array<Record<string, any>>;
}

export async function handler(
  event: CloudFormationCustomResourceEvent
): Promise<{ PhysicalResourceId: string }> {
  console.log('Event:', JSON.stringify(event));

  const requestType = event.RequestType;
  const props = event.ResourceProperties as unknown as ResourceProperties;
  const sid = props.Sid;
  const statement = JSON.parse(props.Statement);
  const enableHybrid = props.EnableHybrid ?? 'true';

  if (requestType === 'Create' || requestType === 'Update') {
    let policy = await getExistingPolicy();
    policy = upsertStatement(policy, sid, statement);

    await glue.putResourcePolicy({
      PolicyInJson: JSON.stringify(policy),
      EnableHybrid: (typeof enableHybrid === 'string' ? enableHybrid.toUpperCase() : 'TRUE') as EnableHybridValues,
    });

    return { PhysicalResourceId: `glue-policy-${sid}` };
  }

  if (requestType === 'Delete') {
    let policy = await getExistingPolicy();
    policy = removeStatement(policy, sid);

    if (policy.Statement.length === 0) {
      await glue.deleteResourcePolicy({});
    } else {
      await glue.putResourcePolicy({
        PolicyInJson: JSON.stringify(policy),
        EnableHybrid: (typeof enableHybrid === 'string' ? enableHybrid.toUpperCase() : 'TRUE') as EnableHybridValues,
      });
    }

    return { PhysicalResourceId: `glue-policy-${sid}` };
  }

  throw new Error(`Unknown request type: ${requestType}`);
}

async function getExistingPolicy(): Promise<PolicyDocument> {
  try {
    const response = await glue.getResourcePolicy({});
    return response.PolicyInJson
      ? JSON.parse(response.PolicyInJson)
      : { Version: '2012-10-17', Statement: [] };
  } catch (error: any) {
    if (error.name === 'EntityNotFoundException') {
      return { Version: '2012-10-17', Statement: [] };
    }
    throw error;
  }
}

function upsertStatement(
  policy: PolicyDocument,
  sid: string,
  statement: Record<string, any>
): PolicyDocument {
  const statements = policy.Statement.filter((s) => s.Sid !== sid);
  statements.push({ ...statement, Sid: sid });
  return { ...policy, Statement: statements };
}

function removeStatement(policy: PolicyDocument, sid: string): PolicyDocument {
  return {
    ...policy,
    Statement: policy.Statement.filter((s) => s.Sid !== sid),
  };
}
