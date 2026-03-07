## Why

텍스트 입력창이 키보드 토글 버튼(⌨)을 눌러야 나타나는 구조는 불편하다. 항상 보이는 입력창으로 접근성을 높인다.

## What Changes

- 키보드 토글 버튼(⌨) 제거
- 텍스트 입력창을 항상 표시 (진주 버튼 위/아래)
- 슬라이드 애니메이션 제거

## Capabilities

### New Capabilities
- `always-visible-text-input`: 텍스트 입력창 항상 표시

### Modified Capabilities

## Impact

- `src/screens/HomeScreen.tsx`: isTypingMode 상태 제거, 애니메이션 제거, 입력창 항상 렌더링
