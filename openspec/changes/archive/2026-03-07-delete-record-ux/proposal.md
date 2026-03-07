## Why

기록 삭제 시 로딩 상태가 없어 느린 기기에서 중복 탭이 발생할 수 있고, 삭제 완료 후 아무 피드백 없이 화면이 사라져 사용자가 삭제 성공 여부를 확신하기 어렵다.

## What Changes

- 삭제 진행 중 삭제 버튼 비활성화로 중복 실행 방지
- `isDeleting` 상태 추가로 삭제 중임을 UI에 반영
- 삭제 성공 시 홈으로 돌아가기 전 Alert 피드백 제거 (즉시 복귀가 더 자연스러움)

## Capabilities

### New Capabilities

- `delete-with-loading`: 삭제 진행 중 버튼 비활성화 및 중복 실행 방지

### Modified Capabilities

## Impact

- `src/screens/RecordDetailScreen.tsx`: `handleDelete`, 삭제 버튼 UI 수정
