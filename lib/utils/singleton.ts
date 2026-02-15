import {Construct} from "constructs";
import * as cdk from "aws-cdk-lib/core";


/**
 * CDK singleton pattern for a resource within a construct
 */
export function singleton<T>(scope: Construct, id: string, createCallback: (scope: Construct, id: string) => T): T {
  const existingConstruct = scope.node.tryFindChild(id);
  if (existingConstruct) {
    return existingConstruct as T;
  }
  return createCallback(scope, id);
}

/**
 * CDK singleton pattern for a resource within a Stack
 */
export function singletonForStack<T>(stack: cdk.Stack, id: string, createCallback: (scope: Construct, id: string) => T): T {
  return singleton(stack, id, createCallback);
}