module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // The Umbra SDK ships static class blocks; preset-expo does not enable them.
    plugins: ['@babel/plugin-transform-class-static-block'],
  };
};
