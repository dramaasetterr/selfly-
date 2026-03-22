const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes in shared packages
config.watchFolders = [monorepoRoot];

// Resolve modules from both the app's node_modules and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Prevent Metro from traversing into apps/web (Next.js) and build artifacts
config.resolver.blockList = [
  /apps[\/\\]web[\/\\].*/,
  /\.next[\/\\].*/,
  /\.expo[\/\\].*/,
];

// Required for monorepo — prevents Metro from resolving modules
// through the directory hierarchy instead of using nodeModulesPaths
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
