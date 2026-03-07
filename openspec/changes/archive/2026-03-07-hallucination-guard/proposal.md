## Why

무음 녹음 시 Whisper STT가 "시청해주셔서 감사합니다" 등 환각(hallucination) 텍스트를 반환해 잘못된 기록이 저장된다. 블랙리스트 필터로 환각을 탐지하고 빈 문자열을 반환해야 한다.

## What Changes

- Whisper 환각 패턴 블랙리스트 추가
- STT 결과가 10자 미만이거나 환각 패턴에 해당하면 빈 문자열 반환

## Capabilities

### New Capabilities
- `hallucination-filter`: Whisper STT 환각 패턴 탐지 및 필터링

### Modified Capabilities

## Impact

- `src/services/stt.ts`: WHISPER_HALLUCINATION_PATTERNS, isHallucination() 추가, whisperSTT 필터 적용
