/**
 * Policy document structure
 */
export interface PolicyDocument {
  Version: string;
  Statement: Array<Record<string, any>>;
}

/**
 * Adds or updates a statement in the policy by SID
 */
export function upsertStatement(
  policy: PolicyDocument,
  sid: string,
  statement: Record<string, any>
): PolicyDocument {
  const statements = policy.Statement.filter((s) => s.Sid !== sid);
  statements.push({ ...statement, Sid: sid });
  return { ...policy, Statement: statements };
}

/**
 * Removes a statement from the policy by SID
 */
export function removeStatement(policy: PolicyDocument, sid: string): PolicyDocument {
  return {
    ...policy,
    Statement: policy.Statement.filter((s) => s.Sid !== sid),
  };
}
