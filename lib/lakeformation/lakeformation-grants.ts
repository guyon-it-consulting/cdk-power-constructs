/**
 * CDK Constructs for AWS Lake Formation permissions management.
 *
 * This module provides a fluent API for granting Lake Formation permissions
 * on databases and tables, including support for S3 Tables.
 */
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cr from "aws-cdk-lib/custom-resources";

/**
 * Common properties for Lake Formation grants.
 */
interface LakeFormationGrantBaseProps {
  readonly principal: iam.IRole;
  readonly lakeFormationAdminRole: iam.IRole;
  readonly permissions?: string[];
  readonly permissionsWithGrant?: string[];
}

/**
 * Properties for granting permissions on an S3 Table or all tables in a namespace.
 */
export interface LakeFormationS3TableGrantProps extends LakeFormationGrantBaseProps {
  /**
   * The S3 Tables catalog ID.
   * Format: `{accountId}:s3tablescatalog/{tableBucketName}`
   */
  readonly catalogId: string;

  /**
   * The namespace (database) name.
   */
  readonly namespaceName: string;

  /**
   * The table name. If omitted, grants permissions on all tables (TableWildcard).
   */
  readonly tableName?: string;
}

/**
 * Properties for granting permissions on an S3 Tables namespace (database).
 */
export interface LakeFormationS3DatabaseGrantProps extends LakeFormationGrantBaseProps {
  /**
   * The S3 Tables catalog ID.
   * Format: `{accountId}:s3tablescatalog/{tableBucketName}`
   */
  readonly catalogId: string;

  /**
   * The namespace (database) name.
   */
  readonly namespaceName: string;
}

/**
 * Properties for granting permissions on a Glue database.
 */
export interface LakeFormationGlueDatabaseGrantProps extends LakeFormationGrantBaseProps {
  /**
   * The Glue database name.
   */
  readonly databaseName: string;
}

/**
 * Properties for granting permissions on a Glue table.
 */
export interface LakeFormationGlueTableGrantProps extends LakeFormationGlueDatabaseGrantProps {
  /**
   * The table name. If omitted, grants permissions on all tables (TableWildcard).
   */
  readonly tableName?: string;
}

/**
 * Creates a Lake Formation grant using AwsCustomResource.
 */
function createGrant(
  scope: Construct,
  id: string,
  props: LakeFormationGrantBaseProps,
  resource: Record<string, unknown>
): cr.AwsCustomResource {
  const params = {
    Principal: { DataLakePrincipalIdentifier: props.principal.roleArn },
    Permissions: props.permissions ?? ["ALL"],
    PermissionsWithGrantOption: props.permissionsWithGrant ?? [],
    Resource: resource,
  };

  const grantAction = {
    service: "LakeFormation",
    action: "grantPermissions",
    parameters: params,
    physicalResourceId: cr.PhysicalResourceId.of(`${id}-grant`),
  };

  return new cr.AwsCustomResource(scope, "Grant", {
    onCreate: grantAction,
    onUpdate: grantAction,
    onDelete: {
      service: "LakeFormation",
      action: "revokePermissions",
      parameters: params,
      ignoreErrorCodesMatching: "EntityNotFoundException|InvalidInput",
    },
    role: props.lakeFormationAdminRole,
  });
}

/**
 * Grants Lake Formation permissions on an S3 Table (or all tables via wildcard) to a principal.
 */
export class LakeFormationS3TableGrant extends Construct {
  constructor(scope: Construct, id: string, props: LakeFormationS3TableGrantProps) {
    super(scope, id);

    const tableDef: Record<string, unknown> = {
      CatalogId: props.catalogId,
      DatabaseName: props.namespaceName,
    };

    if (props.tableName) {
      tableDef.Name = props.tableName;
    } else {
      tableDef.TableWildcard = {};
    }

    createGrant(this, id, props, { Table: tableDef });
  }
}

/**
 * Grants Lake Formation permissions on an S3 Tables namespace (database) to a principal.
 */
export class LakeFormationS3DatabaseGrant extends Construct {
  constructor(scope: Construct, id: string, props: LakeFormationS3DatabaseGrantProps) {
    super(scope, id);

    createGrant(this, id, props, {
      Database: {
        CatalogId: props.catalogId,
        Name: props.namespaceName,
      },
    });
  }
}

/**
 * Grants Lake Formation permissions on a Glue database to a principal.
 */
export class LakeFormationGlueDatabaseGrant extends Construct {
  constructor(scope: Construct, id: string, props: LakeFormationGlueDatabaseGrantProps) {
    super(scope, id);

    createGrant(this, id, props, {
      Database: {
        Name: props.databaseName,
      },
    });
  }
}

/**
 * Grants Lake Formation permissions on a Glue table to a principal.
 */
export class LakeFormationGlueTableGrant extends Construct {
  constructor(scope: Construct, id: string, props: LakeFormationGlueTableGrantProps) {
    super(scope, id);

    const tableDef: Record<string, unknown> = {
      DatabaseName: props.databaseName,
    };

    if (props.tableName) {
      tableDef.Name = props.tableName;
    } else {
      tableDef.TableWildcard = {};
    }

    createGrant(this, id, props, { Table: tableDef });
  }
}

/**
 * Optional overrides for a Lake Formation grant.
 */
export interface LakeFormationGrantOptions {
  /**
   * Lake Formation permissions to grant.
   * @default ['ALL']
   */
  readonly permissions?: string[];

  /**
   * Lake Formation permissions with grant option.
   * @default []
   */
  readonly permissionsWithGrant?: string[];
}

/**
 * Fluent API for Lake Formation grants.
 *
 * This class provides a builder pattern for granting Lake Formation permissions
 * to IAM principals on databases and tables.
 *
 * @example
 * ```typescript
 * import { LakeFormationGrants } from 'cdk-power-constructs/lakeformation';
 *
 * const lfGrants = new LakeFormationGrants(this, 'LFGrants', {
 *   adminRole: lakeFormationAdminRole,
 * });
 *
 * // Grant permissions using fluent API
 * lfGrants.grant(sparkExecutionRole)
 *   .onGlueDatabase('my-database')
 *   .onAllGlueTables('my-database');
 *
 * // Grant permissions on S3 Tables
 * lfGrants.grant(analyticsRole)
 *   .onS3Database(catalogId, 'my-namespace')
 *   .onAllS3Tables(catalogId, 'my-namespace');
 * ```
 */
export class LakeFormationGrants extends Construct {
  private readonly adminRole: iam.IRole;

  /**
   * Creates a new LakeFormationGrants instance.
   *
   * @param scope CDK scope
   * @param id Construct ID
   * @param props Configuration properties
   */
  constructor(scope: Construct, id: string, props: LakeFormationGrantsProps) {
    super(scope, id);
    this.adminRole = props.adminRole;
  }

  /**
   * Start a grant chain for the given principal.
   *
   * @param principal The IAM role to grant permissions to
   * @returns A fluent grant builder
   */
  grant(principal: iam.IRole): LakeFormationPrincipalGrant {
    return new LakeFormationPrincipalGrant(this, this.adminRole, principal);
  }
}

/**
 * Properties for LakeFormationGrants construct.
 */
export interface LakeFormationGrantsProps {
  /**
   * The Lake Formation administrator role that will be used to grant permissions.
   * This role must be a Lake Formation administrator.
   */
  readonly adminRole: iam.IRole;
}

/**
 * Fluent grant chain scoped to a single principal.
 * Each `.on*()` call creates the underlying construct immediately.
 */
export class LakeFormationPrincipalGrant {
  /**
   * All grant constructs created by this chain.
   * Use to add dependencies on the grants.
   */
  public readonly grants: Construct[] = [];

  private counter = 0;

  constructor(
    private readonly scope: Construct,
    private readonly adminRole: iam.IRole,
    private readonly principal: iam.IRole
  ) {}

  private generateId(resource: string): string {
    const principalId = this.principal.node.id || "Principal";
    return `LfGrant-${principalId}-${resource}-${this.counter++}`;
  }

  /**
   * Grant permissions on an S3 Tables database (namespace).
   *
   * @param catalogId The S3 Tables catalog ID (format: `{accountId}:s3tablescatalog/{tableBucketName}`)
   * @param namespaceName The namespace name
   * @param options Optional grant configuration
   */
  onS3Database(catalogId: string, namespaceName: string, options?: LakeFormationGrantOptions): this {
    const grant = new LakeFormationS3DatabaseGrant(this.scope, this.generateId(`S3Db-${namespaceName}`), {
      catalogId,
      namespaceName,
      principal: this.principal,
      lakeFormationAdminRole: this.adminRole,
      ...options,
    });
    this.grants.push(grant);
    return this;
  }

  /**
   * Grant permissions on all S3 Tables in a namespace.
   *
   * @param catalogId The S3 Tables catalog ID
   * @param namespaceName The namespace name
   * @param options Optional grant configuration
   */
  onAllS3Tables(catalogId: string, namespaceName: string, options?: LakeFormationGrantOptions): this {
    const grant = new LakeFormationS3TableGrant(this.scope, this.generateId(`S3AllTbl-${namespaceName}`), {
      catalogId,
      namespaceName,
      principal: this.principal,
      lakeFormationAdminRole: this.adminRole,
      ...options,
    });
    this.grants.push(grant);
    return this;
  }

  /**
   * Grant permissions on a specific S3 Table.
   *
   * @param catalogId The S3 Tables catalog ID
   * @param namespaceName The namespace name
   * @param tableName The table name
   * @param options Optional grant configuration
   */
  onS3Table(
    catalogId: string,
    namespaceName: string,
    tableName: string,
    options?: LakeFormationGrantOptions
  ): this {
    const grant = new LakeFormationS3TableGrant(
      this.scope,
      this.generateId(`S3Tbl-${namespaceName}-${tableName}`),
      {
        catalogId,
        namespaceName,
        tableName,
        principal: this.principal,
        lakeFormationAdminRole: this.adminRole,
        ...options,
      }
    );
    this.grants.push(grant);
    return this;
  }

  /**
   * Grant permissions on a Glue database.
   *
   * @param databaseName The Glue database name
   * @param options Optional grant configuration
   */
  onGlueDatabase(databaseName: string, options?: LakeFormationGrantOptions): this {
    const grant = new LakeFormationGlueDatabaseGrant(this.scope, this.generateId(`GlueDb-${databaseName}`), {
      databaseName,
      principal: this.principal,
      lakeFormationAdminRole: this.adminRole,
      ...options,
    });
    this.grants.push(grant);
    return this;
  }

  /**
   * Grant permissions on a specific Glue table.
   *
   * @param databaseName The Glue database name
   * @param tableName The table name
   * @param options Optional grant configuration
   */
  onGlueTable(databaseName: string, tableName: string, options?: LakeFormationGrantOptions): this {
    const grant = new LakeFormationGlueTableGrant(
      this.scope,
      this.generateId(`GlueTbl-${databaseName}-${tableName}`),
      {
        databaseName,
        tableName,
        principal: this.principal,
        lakeFormationAdminRole: this.adminRole,
        ...options,
      }
    );
    this.grants.push(grant);
    return this;
  }

  /**
   * Grant permissions on all Glue tables in a database.
   *
   * @param databaseName The Glue database name
   * @param options Optional grant configuration
   */
  onAllGlueTables(databaseName: string, options?: LakeFormationGrantOptions): this {
    const grant = new LakeFormationGlueTableGrant(
      this.scope,
      this.generateId(`GlueAllTbl-${databaseName}`),
      {
        databaseName,
        principal: this.principal,
        lakeFormationAdminRole: this.adminRole,
        ...options,
      }
    );
    this.grants.push(grant);
    return this;
  }
}
