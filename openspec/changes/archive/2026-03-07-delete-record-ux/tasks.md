## 1. RecordDetailScreen 수정

- [x] 1.1 `isDeleting` 상태 추가 (`useState<boolean>(false)`)
- [x] 1.2 `handleDelete`의 삭제 onPress 콜백에서 시작 시 `isDeleting(true)`, 완료/실패 시 `false` 설정
- [x] 1.3 삭제 버튼에 `disabled={isDeleting}` 및 `opacity` 스타일 연동

## 2. 검증

- [x] 2.1 삭제 버튼 클릭 → Alert → 삭제 확인 시 버튼 비활성화 확인
- [x] 2.2 삭제 완료 시 즉시 이전 화면 복귀 확인
