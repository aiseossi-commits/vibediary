const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .wasm 파일을 asset으로 처리 (expo-sqlite 웹 지원)
config.resolver.assetExts.push('wasm');

module.exports = config;
