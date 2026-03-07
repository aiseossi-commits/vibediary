## Why

녹음 버튼이 단순한 원형 버튼이라 기능을 직관적으로 알기 어렵다. 마이크 아이콘을 추가해 녹음 기능임을 명확히 전달한다.

## What Changes

- 진주(pearl) 버튼 내부에 마이크 아이콘(Ionicons mic-outline) 추가
- 아이콘 색상은 테마에 따라 투명도 적용 (라이트/다크 모드 구분)

## Capabilities

### New Capabilities
- `mic-icon-display`: 녹음 버튼에 마이크 아이콘 표시

### Modified Capabilities

## Impact

- `src/screens/HomeScreen.tsx`: 진주 버튼에 Ionicons 마이크 아이콘 추가
