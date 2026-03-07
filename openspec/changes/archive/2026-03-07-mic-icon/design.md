## Context

기존 진주 버튼에는 시각적 단서가 없었다. Ionicons 라이브러리가 이미 프로젝트에 포함되어 있으므로 추가 의존성 없이 구현 가능하다.

## Goals / Non-Goals

**Goals:**
- 녹음 기능 직관성 향상

**Non-Goals:**
- 애니메이션 아이콘
- 커스텀 SVG 아이콘

## Decisions

### Decision 1: Ionicons mic-outline 사용

기존 앱에서 이미 사용 중인 Ionicons를 활용. size=52, 색상은 `colors.secondary === '#EAEAEA'`(다크 모드)이면 `rgba(5,22,34,0.35)`, 라이트 모드면 `rgba(255,255,255,0.35)`.
