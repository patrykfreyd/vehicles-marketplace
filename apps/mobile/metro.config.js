const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm workspaces expose internal packages (@vehicles-marketplace/*) as
// symlinks into packages/*/src, and Metro needs explicit help to follow
// them and to find the workspace root's node_modules — see
// https://docs.expo.dev/guides/monorepos/ for the recipe this mirrors.
config.watchFolders = [workspaceRoot];
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
