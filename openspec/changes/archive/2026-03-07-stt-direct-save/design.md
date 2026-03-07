## Context

기존에는 녹음 → STTReviewScreen → 확인 → 저장 순이었다. 리뷰 화면은 실수 교정 목적이었으나, 음성 기록의 즉각성이 더 중요하다고 판단.

## Goals / Non-Goals

**Goals:**
- 녹음 → 저장 흐름 단순화

**Non-Goals:**
- STT 결과 편집 기능 제거 (RecordDetailScreen에서 가능)

## Decisions

### Decision 1: AppNavigator에서 직접 처리

RecordingScreenWrapper의 handleRecordingComplete에서 runSTTOnly → processFromText 순으로 처리. STTReviewScreen 라우트는 코드에서 제거.
