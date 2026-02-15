import { upsertStatement, removeStatement } from '../../../../lib/glue/glue-resource-policy/policy-utils';

describe('Glue Policy Handler', () => {
  describe('upsertStatement', () => {
    test('adds new statement to empty policy', () => {
      const policy = { Version: '2012-10-17', Statement: [] };
      const statement = {
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::123456789012:root' },
        Action: 'glue:GetDatabase',
        Resource: '*',
      };

      const result = upsertStatement(policy, 'TestSid', statement);

      expect(result.Statement).toHaveLength(1);
      expect(result.Statement[0]).toEqual({ ...statement, Sid: 'TestSid' });
    });

    test('adds new statement to existing policy', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          { Sid: 'ExistingSid', Effect: 'Allow', Action: 'glue:GetTable', Resource: '*' },
        ],
      };
      const statement = {
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::123456789012:root' },
        Action: 'glue:GetDatabase',
        Resource: '*',
      };

      const result = upsertStatement(policy, 'NewSid', statement);

      expect(result.Statement).toHaveLength(2);
      expect(result.Statement[0].Sid).toBe('ExistingSid');
      expect(result.Statement[1].Sid).toBe('NewSid');
    });

    test('updates existing statement with same SID', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          { Sid: 'TestSid', Effect: 'Allow', Action: 'glue:GetTable', Resource: '*' },
        ],
      };
      const statement = {
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::123456789012:root' },
        Action: 'glue:GetDatabase',
        Resource: '*',
      };

      const result = upsertStatement(policy, 'TestSid', statement);

      expect(result.Statement).toHaveLength(1);
      expect(result.Statement[0]).toEqual({ ...statement, Sid: 'TestSid' });
      expect(result.Statement[0].Action).toBe('glue:GetDatabase');
    });
  });

  describe('removeStatement', () => {
    test('removes statement by SID', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          { Sid: 'Sid1', Effect: 'Allow', Action: 'glue:GetTable', Resource: '*' },
          { Sid: 'Sid2', Effect: 'Allow', Action: 'glue:GetDatabase', Resource: '*' },
        ],
      };

      const result = removeStatement(policy, 'Sid1');

      expect(result.Statement).toHaveLength(1);
      expect(result.Statement[0].Sid).toBe('Sid2');
    });

    test('returns empty statement array when removing last statement', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [{ Sid: 'OnlySid', Effect: 'Allow', Action: 'glue:GetTable', Resource: '*' }],
      };

      const result = removeStatement(policy, 'OnlySid');

      expect(result.Statement).toHaveLength(0);
    });

    test('does nothing when SID not found', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [{ Sid: 'ExistingSid', Effect: 'Allow', Action: 'glue:GetTable', Resource: '*' }],
      };

      const result = removeStatement(policy, 'NonExistentSid');

      expect(result.Statement).toHaveLength(1);
      expect(result.Statement[0].Sid).toBe('ExistingSid');
    });
  });
});
