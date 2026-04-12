module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      './babel-plugin-import-meta-env',
      'react-native-reanimated/plugin',
    ],
  };
};
