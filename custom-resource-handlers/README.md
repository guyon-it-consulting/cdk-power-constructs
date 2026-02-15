# Custom Resource Handlers

This directory contains Lambda handlers for custom resources used by CDK constructs.

## Structure

Handlers are organized in a single shared project with common dependencies:

```
custom-resource-handlers/
├── lib/
│   └── glue-policy-handler.ts    # Handler source code
├── dist/
│   ├── glue-policy-handler.js    # Bundled handler (generated)
│   └── glue-policy-handler.generated.ts  # Import helper (generated)
├── scripts/
│   └── generate.js               # Build script
├── package.json                  # Shared dependencies
└── tsconfig.json                 # Shared TypeScript config
```

## Why This Structure?

1. **Dependency Isolation**: Handler dependencies (like `@aws-sdk/client-glue`) don't pollute the main library
2. **Pre-bundling**: Handlers are bundled at build time, not at CDK synth/deploy time
3. **Faster Deployments**: No need to bundle TypeScript during CDK operations
4. **Generated Imports**: `.generated.ts` files provide type-safe imports with `.generated` suffix (AWS CDK pattern)

## Build Process

Handlers are automatically built when running `npm run build` in the root project:

```bash
npm run build  # Builds handlers first, then the main library
```

The build process:
1. Compiles TypeScript handlers
2. Bundles each handler with esbuild (minified, external @aws-sdk)
3. Generates `.generated.ts` files in both `dist/` and `../lib/generated/`

## Using Handlers in Constructs

Import from the generated file with `.generated` suffix:

```typescript
import { getHandlerCode, HANDLER_NAME, RUNTIME } from '../../generated/glue-policy-handler.generated';

const handler = new lambda.Function(this, 'Handler', {
  runtime: RUNTIME,
  handler: HANDLER_NAME,
  code: getHandlerCode(),
});
```

## Adding a New Handler

1. Create handler file: `lib/my-handler.ts`
2. Add to `scripts/generate.js` handlers config:
   ```javascript
   const handlers = {
     'glue-policy-handler': {
       entryPoint: 'lib/glue/glue-resource-policy/handler.ts',
       runtime: 'NODEJS_20_X',
     },
     'my-handler': {
       entryPoint: 'lib/my-handler.ts',
       runtime: 'NODEJS_20_X',  // or PYTHON_3_12, etc.
     },
   };
   ```
3. Run `npm run build` in root project
4. Import in your construct:
   ```typescript
   import { getHandlerCode, HANDLER_NAME, RUNTIME } from '../../generated/my-handler.generated';
   ```

## Pattern Inspired By

This structure follows the pattern used by AWS CDK:
https://github.com/aws/aws-cdk/tree/main/packages/@aws-cdk/custom-resource-handlers

