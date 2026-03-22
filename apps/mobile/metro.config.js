const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Suppress EAS build warning
if (config.watcher) {
  delete config.watcher.unstable_workerThreads;
}
module.exports = config;
