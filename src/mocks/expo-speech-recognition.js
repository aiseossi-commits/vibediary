// Expo Go 환경에서 expo-speech-recognition 대체 mock
// 네이티브 모듈이 없으므로 빈 구현 제공 → Whisper fallback으로 동작

export const ExpoSpeechRecognitionModule = {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: () => {},
  stop: () => {},
  abort: () => {},
  addListener: () => ({ remove: () => {} }),
  removeListeners: () => {},
};

export const ExpoWebSpeechRecognition = null;
export const ExpoWebSpeechGrammar = null;
export const ExpoWebSpeechGrammarList = null;
export const useSpeechRecognitionEvent = () => {};
export const AVAudioSessionCategory = {};
export const AVAudioSessionCategoryOptions = {};
export const AVAudioSessionMode = {};
export const RecognizerIntentExtraLanguageModel = {};
export const RecognizerIntentEnableLanguageSwitch = {};
export const AudioEncodingAndroid = {};
export const TaskHintIOS = {};
export const SpeechRecognizerErrorAndroid = {};
