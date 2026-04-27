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

module.exports = withNativeWind(config, { input: './global.css' });
