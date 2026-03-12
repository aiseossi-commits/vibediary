const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// .wasm 파일을 asset으로 처리 (expo-sqlite 웹 지원)
config.resolver.assetExts.push('wasm');

// expo-speech-recognition은 Expo Go 미지원 네이티브 모듈
// Metro가 mock으로 대체 → Expo Go 크래시 방지 (STT는 Whisper fallback 사용)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-speech-recognition') {
    return {
      filePath: path.resolve(__dirname, 'src/mocks/expo-speech-recognition.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'expo-av') {
    return {
      filePath: path.resolve(__dirname, 'src/mocks/expo-av.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
