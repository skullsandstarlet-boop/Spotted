const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const crypto = require('crypto');

const config = getDefaultConfig(__dirname);

// Optimize module IDs for faster bundling
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: () => (path) => {
    return crypto
      .createHash('md5')
      .update(path)
      .digest('hex')
      .substr(0, 8);
  },
};

// Optimize transformer for faster processing
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    output: {
      comments: false,
    },
  },
  // Skip expensive babel transformations in node_modules
  enableBabelRCLookup: false,
};

// Optimize resolver for all platforms builds
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'web'],
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
