const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
  crypto: path.resolve(__dirname, 'crypto-shim.js'),
  fs: path.resolve(__dirname, 'fs-shim.js'),
  snarkjs: path.resolve(__dirname, 'snarkjs-shim.js'),
};


if (!config.resolver.assetExts.includes('zkey')) {
  config.resolver.assetExts.push('zkey');
}

const moduleOverrides = {
  '@bufbuild/protobuf/codegenv2': path.resolve(
    __dirname,
    'node_modules/@bufbuild/protobuf/dist/cjs/codegenv2/index.js',
  ),
  isows: path.resolve(__dirname, 'node_modules/isows/_cjs/native.js'),
  '@adraffy/ens-normalize': path.resolve(
    __dirname,
    'node_modules/@adraffy/ens-normalize/dist/index.mjs',
  ),
  '@posthog/core/surveys': path.resolve(
    __dirname,
    'node_modules/@posthog/core/dist/surveys/index.js',
  ),
  '@solana/kit/program-client-core': path.resolve(
    __dirname,
    'node_modules/@solana/kit/dist/program-client-core.native.mjs',
  ),
  '@peculiar/utils/bytes': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/bytes/index.js',
  ),
  '@peculiar/utils/converters': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/converters/index.js',
  ),
  '@peculiar/utils/encoding': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/encoding/index.js',
  ),
  '@peculiar/utils/legacy': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/legacy/index.js',
  ),
  '@peculiar/utils/pem': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/pem/index.js',
  ),
  '@umbra-privacy/sdk/query': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/operations/query/index.js',
  ),
  '@umbra-privacy/sdk/registration': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/operations/registration/index.js',
  ),
  '@umbra-privacy/sdk/deposit': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/operations/deposit/index.js',
  ),
  '@umbra-privacy/sdk/withdrawal': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/operations/withdrawal/index.js',
  ),
  '@umbra-privacy/sdk/burn': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/operations/burn/index.js',
  ),
  '@umbra-privacy/sdk/errors': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/core/errors/index.js',
  ),
  '@umbra-privacy/sdk/store-adapters': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/persistence/adapters/index.js',
  ),
  '@umbra-privacy/sdk/master-seed-schemes': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/master-seed-schemes/index.js',
  ),
  '@umbra-privacy/sdk/crypto/aes': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/primitives/crypto/aes/index.js',
  ),
  '@umbra-privacy/sdk/solana': path.resolve(
    __dirname,
    'node_modules/@umbra-privacy/sdk/dist/infrastructure/solana/index.js',
  ),
};

const wrapped = withNativeWind(config, { input: './global.css' });

const previousResolveRequest = wrapped.resolver.resolveRequest;
wrapped.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleOverrides[moduleName]) {
    return { type: 'sourceFile', filePath: moduleOverrides[moduleName] };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = wrapped;
