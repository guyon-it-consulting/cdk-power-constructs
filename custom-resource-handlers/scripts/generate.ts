import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';

interface HandlerConfig {
  entryPoint: string;
  runtime: string;
}

// Get the root directory - tsx provides __dirname
const rootDir = path.resolve(__dirname, '..');

// Configuration: map handler name to source file and runtime
const handlers: Record<string, HandlerConfig> = {
  'glue-policy-handler': {
    entryPoint: path.join(rootDir, 'lib/glue/glue-resource-policy/handler.ts'),
    runtime: 'NODEJS_LATEST',
  },
  'route53-cross-account-handler': {
    entryPoint: path.join(rootDir, 'lib/route53/route53-cross-account.handler.ts'),
    runtime: 'NODEJS_22_X',
  },
  'certificate-cross-account-handler': {
    entryPoint: path.join(rootDir, 'lib/certificate/certificate-cross-account.handler.ts'),
    runtime: 'NODEJS_22_X',
  },
  'lakeformation-admin-handler': {
    entryPoint: path.join(rootDir, 'lib/lakeformation/lakeformation-admin.handler.ts'),
    runtime: 'NODEJS_22_X',
  },
};

async function main() {
  // Ensure dist directory exists
  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Bundle each handler
  for (const [name, config] of Object.entries(handlers)) {
    const outfile = path.join(distDir, `${name}.js`);

    console.log(`Bundling ${name}...`);
    const result = await esbuild.build({
      entryPoints: [config.entryPoint],
      outfile,
      external: ['@aws-sdk/*', 'aws-sdk'],
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      bundle: true,
      minify: true,
      minifyWhitespace: true,
      minifySyntax: true,
      minifyIdentifiers: true,
      sourcemap: false,
      tsconfig: path.join(rootDir, 'tsconfig.json'),
      logOverride: {
        'unsupported-dynamic-import': 'warning',
        'unsupported-require-call': 'warning',
        'indirect-require': 'warning',
      },
      logLevel: 'error',
    });

    // Check for build failures (errors + non-suppressed warnings)
    const failures = [
      ...result.errors,
      ...ignoreWarnings(result),
    ];

    if (failures.length > 0) {
      const messages = esbuild.formatMessagesSync(failures, {
        kind: 'error',
        color: true,
      });
      console.log(messages.join('\n'));
      console.log(`${messages.length} errors. For false positives, put '// esbuild-disable <warning-id>' on the line before`);
      process.exitCode = 1;
      continue;
    }

    // Generate .generated.ts file for importing in constructs
    // Read the bundled code and create an inline constant
    const bundledCode = fs.readFileSync(outfile, 'utf-8');
    const escapedCode = bundledCode
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    const constName = name.replace(/-/g, '_').toUpperCase();

    const generatedContent = `// Generated file - do not edit
import * as lambda from 'aws-cdk-lib/aws-lambda';

export const ${constName} = \`${escapedCode}\`;

export function getHandlerCode(): lambda.Code {
  return lambda.Code.fromInline(${constName});
}

export const HANDLER_NAME = 'index.handler';
export const RUNTIME = lambda.Runtime.${config.runtime};
`;

    // Write to both dist/ and parent lib/ directory
    const generatedFile = path.join(distDir, `${name}.generated.ts`);
    fs.writeFileSync(generatedFile, generatedContent);

    // Copy to parent lib directory for jsii
    const parentLibDir = path.join(rootDir, '..', 'lib', 'generated');
    if (!fs.existsSync(parentLibDir)) {
      fs.mkdirSync(parentLibDir, { recursive: true });
    }
    const parentGeneratedFile = path.join(parentLibDir, `${name}.generated.ts`);
    fs.writeFileSync(parentGeneratedFile, generatedContent);

    console.log(`Generated ${generatedFile} and ${parentGeneratedFile}`);
  }

  console.log('✓ All handlers bundled successfully');
}

function ignoreWarnings(result: esbuild.BuildResult): esbuild.Message[] {
  const ret: esbuild.Message[] = [];

  for (const warning of result.warnings) {
    let suppressed = false;

    if (warning.location?.file) {
      try {
        const contents = fs.readFileSync(warning.location.file, { encoding: 'utf-8' });
        const lines = contents.split('\n');
        const lineBefore = lines[warning.location.line - 1 - 1];

        if (lineBefore && lineBefore.includes(`esbuild-disable ${warning.id}`)) {
          suppressed = true;
        }
      } catch (e) {
        // If we can't read the file, don't suppress
      }
    }

    if (!suppressed) {
      ret.push(warning);
    }
  }

  return ret;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

