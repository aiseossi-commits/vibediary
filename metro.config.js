const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// .wasm 파일을 asset으로 처리 (expo-sqlite 웹 지원)
config.resolver.assetExts.push('wasm');

// Node.js 내장 모듈 polyfill (markdown-it → punycode)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: path.resolve(__dirname, 'node_modules/punycode'),
};

module.exports = config;
