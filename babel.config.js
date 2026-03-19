module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      ...(!api.env('development') ? ['transform-remove-console'] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
