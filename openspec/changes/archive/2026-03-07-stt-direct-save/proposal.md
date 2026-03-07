## Why

녹음 후 STT 결과를 수동으로 확인하는 화면(STTReviewScreen)이 불필요한 단계를 추가한다. 확인 없이 바로 저장하면 사용자 흐름이 자연스러워진다.

## What Changes

- 녹음 완료 후 STTReviewScreen으로 이동하지 않고 바로 저장
- STT 결과를 자동으로 AI 처리 후 홈 화면으로 복귀
- 무음 감지 시 Alert로 안내 후 재녹음 유도

## Capabilities

### New Capabilities
- `stt-auto-save`: STT 결과를 자동으로 저장 (리뷰 화면 없음)

### Modified Capabilities

## Impact

- `src/navigation/AppNavigator.tsx`: handleRecordingComplete 로직 변경, STTReviewScreen 라우트 제거
