module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      ...(process.env.NODE_ENV === 'production' ? ['transform-remove-console'] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
