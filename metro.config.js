const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
  crypto: path.resolve(__dirname, 'crypto-shim.js'),
  fs: path.resolve(__dirname, 'fs-shim.js'),
};

// Bundle Umbra ZK circuit keys (.zkey) as binary assets — required by
// @umbra-privacy/rn-zk-prover when Slice 5 wires the Stealth provers.
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
};

const wrapped = withNativeWind(config, { input: './global.css' });

// Apply overrides AFTER withNativeWind so its own wrapper doesn't replace
// our resolveRequest. Metro calls resolveRequest first; we either return a
// match from moduleOverrides or hand off to whatever was previously set.
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
