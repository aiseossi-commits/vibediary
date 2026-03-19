# reanimated-blob

## Purpose

OrganicBlob 컴포넌트의 UI 스레드 애니메이션 요구사항. Reanimated worklet을 사용하여 JS 스레드 부하와 무관하게 60fps 애니메이션을 보장한다.

---

## Requirements

### Requirement: OrganicBlob UI 스레드 애니메이션
OrganicBlob의 borderRadius 4개 애니메이션은 Reanimated worklet을 사용하여 UI 스레드에서 실행되어야 한다. JS 스레드 점유 없이 60fps를 유지해야 한다.

#### Scenario: 녹음 중 JS 부하 발생
- **WHEN** STT 처리, DB 쿼리 등 JS 스레드 부하가 높을 때
- **THEN** OrganicBlob 애니메이션은 끊김 없이 지속된다

#### Scenario: audioLevel 반응
- **WHEN** audioLevel 값이 0.05를 초과하면
- **THEN** blob이 audioLevel에 비례하여 scale이 커지며, 이 반응도 UI 스레드에서 처리된다

#### Scenario: 애니메이션 루프 시작 및 정리
- **WHEN** OrganicBlob 컴포넌트가 마운트되면
- **THEN** 4개의 borderRadius 값이 각기 다른 duration으로 반복 oscillation을 시작한다
- **WHEN** 컴포넌트가 언마운트되면
- **THEN** 모든 애니메이션이 정리된다
