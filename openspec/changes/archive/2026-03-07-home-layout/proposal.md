## Why

홈 화면에서 텍스트 입력창이 진주 버튼 위에 있어 불안정한 느낌을 준다. 입력창을 아래에 배치하고 보내기 버튼을 항상 표시해 안정감 있는 레이아웃을 제공한다.

## What Changes

- 진주 버튼(위) → 텍스트 입력창(아래) 순서로 변경
- 보내기 버튼 항상 표시 (텍스트 없을 때 반투명 비활성)

## Capabilities

### New Capabilities
- `home-bottom-layout`: 진주 버튼 위, 입력창 아래 레이아웃 + 항상 표시 보내기 버튼

### Modified Capabilities

## Impact

- `src/screens/HomeScreen.tsx`: bottomArea 순서 변경, 보내기 버튼 조건부 렌더링 제거
