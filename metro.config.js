const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The marketing site lives at ./website and carries its own React and
// Next.js in its own node_modules. Metro watches the repo root, so
// without this it resolves two copies of React and the app bundle fails
// with duplicate-module errors.
config.resolver.blockList = [/\/website\/.*/];

module.exports = config;
