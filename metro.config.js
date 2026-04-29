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

// Manual subpath / variant overrides.
// `unstable_enablePackageExports = false` (above) prevents Metro from reading
// `package.json#exports`, so any module imported via a subpath (e.g.
// `@bufbuild/protobuf/codegenv2`) won't resolve out of the box. Same for
// packages that ship a node-only `.cjs` we don't want.
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
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleOverrides[moduleName]) {
    return { type: 'sourceFile', filePath: moduleOverrides[moduleName] };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
