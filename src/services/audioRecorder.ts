import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

export interface RecordingResult {
  uri: string;
  duration: number; // ms
  fileName: string;
}

let recording: Audio.Recording | null = null;
let onMeteringUpdate: ((level: number) => void) | null = null;

// metering 콜백 등록 (0~1 범위로 정규화된 음량)
export function setMeteringCallback(cb: ((level: number) => void) | null) {
  onMeteringUpdate = cb;
}

// 오디오 권한 요청
async function requestAudioPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

// 녹음 시작
export async function startRecording(): Promise<void> {
  // 이전 녹음 객체가 남아있으면 강제 해제 (연속 녹음 시 충돌 방지)
  if (recording) {
    try { await recording.stopAndUnloadAsync(); } catch {}
    recording = null;
  }

  const hasPermission = await requestAudioPermission();
  if (!hasPermission) {
    throw new Error('마이크 권한이 필요합니다');
  }

  // 오디오 모드 설정 (백그라운드 녹음 지원)
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
  });

  const { recording: newRecording } = await Audio.Recording.createAsync(
    { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (status) => {
      if (status.isRecording && status.metering !== undefined && onMeteringUpdate) {
        // dBFS(-60~0) → 0~1 정규화
        const level = Math.max(0, Math.min(1, (status.metering + 60) / 60));
        onMeteringUpdate(level);
      }
    },
    80 // 80ms마다 업데이트
  );

  recording = newRecording;
}

// 녹음 정지 및 파일 저장
export async function stopRecording(): Promise<RecordingResult> {
  if (!recording) {
    throw new Error('진행 중인 녹음이 없습니다');
  }

  const currentRecording = recording;
  recording = null;

  await currentRecording.stopAndUnloadAsync();

  // 오디오 모드 복원
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
  });

  const uri = currentRecording.getURI();
  const status = await currentRecording.getStatusAsync();

  if (!uri) {
    throw new Error('녹음 파일을 찾을 수 없습니다');
  }

  // 앱 전용 디렉토리에 파일 이동
  const fileName = `recording_${Crypto.randomUUID()}.m4a`;
  const destDir = `${FileSystem.documentDirectory}recordings/`;
  const destUri = `${destDir}${fileName}`;

  // 디렉토리 확인 및 생성
  const dirInfo = await FileSystem.getInfoAsync(destDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
  }

  await FileSystem.moveAsync({ from: uri, to: destUri });

  return {
    uri: destUri,
    duration: status.durationMillis ?? 0,
    fileName,
  };
}

// 녹음 일시중지
export async function pauseRecording(): Promise<void> {
  if (!recording) return;
  await recording.pauseAsync();
}

// 녹음 재개
export async function resumeRecording(): Promise<void> {
  if (!recording) return;
  await recording.startAsync();
}

// 녹음 상태 확인
export function isRecording(): boolean {
  return recording !== null;
}

// 음성 파일 삭제
export async function deleteAudioFile(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch {
    // 파일이 이미 삭제된 경우 무시
  }
}

// 음성 파일 재생
export async function playAudio(uri: string): Promise<Audio.Sound> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  return sound;
}
