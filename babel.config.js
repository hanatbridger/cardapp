module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      './babel-plugin-import-meta-env',
      // The tabler barrel requires ~5,900 icon modules; Metro doesn't
      // tree-shake, so without this rewrite every screen's first icon
      // render evaluates the whole set during app launch.
      [
        'transform-imports',
        {
          '@tabler/icons-react-native': {
            transform: '@tabler/icons-react-native/dist/esm/icons/${member}.mjs',
            preventFullImport: true,
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
