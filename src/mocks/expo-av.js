// Expo Go 환경에서 expo-av 대체 mock (녹음/재생 기능 비활성화)
export const Audio = {
  Recording: {
    createAsync: async () => ({ recording: { stopAndUnloadAsync: async () => {}, getURI: () => null, getStatusAsync: async () => ({ durationMillis: 0 }) } }),
  },
  RecordingOptionsPresets: { HIGH_QUALITY: {} },
  Sound: {
    createAsync: async () => ({ sound: { playAsync: async () => {}, stopAsync: async () => {}, unloadAsync: async () => {} } }),
  },
  setAudioModeAsync: async () => {},
  requestPermissionsAsync: async () => ({ granted: false }),
};

export const Video = null;
export const ResizeMode = {};
export const InterruptionModeIOS = {};
export const InterruptionModeAndroid = {};
