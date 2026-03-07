## Context

기존 레이아웃은 inputBar가 pearlContainer 위에 있어 시각적으로 불안정했다.

## Goals / Non-Goals

**Goals:**
- 안정감 있는 하단 레이아웃

**Non-Goals:**
- 레이아웃 애니메이션

## Decisions

### Decision 1: JSX 순서 변경

bottomArea 내에서 pearlContainer를 먼저, inputBar를 나중에 배치. marginBottom → marginTop으로 변경.

### Decision 2: 보내기 버튼 항상 렌더링

조건부 렌더링 제거. 텍스트 없을 때 opacity: 0.35 + disabled로 시각적 피드백 제공.
