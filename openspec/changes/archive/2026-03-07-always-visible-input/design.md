## Context

기존에는 isTypingMode 상태와 슬라이드 애니메이션으로 입력창을 토글했다. 단순 제거로 UX 개선.

## Goals / Non-Goals

**Goals:**
- 입력창 접근성 향상

**Non-Goals:**
- 입력창 크기 변경
- 멀티라인 지원

## Decisions

### Decision 1: 상태/애니메이션 완전 제거

isTypingMode, slideAnim, fadeAnim 상태 및 관련 로직 모두 제거. 입력창을 bottomArea에 항상 렌더링.
