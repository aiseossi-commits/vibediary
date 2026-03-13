## Why

폰 교체나 앱 재설치 시 모든 기록이 유실된다. expo-sqlite DB가 기기 로컬에만 존재하므로 외부로 내보낼 수단이 없어 데이터 이전이 불가능하다.

## What Changes

- 설정 화면에 "데이터 백업/복원" 섹션 추가
- **내보내기**: 전체 기록(children, records, tags)을 JSON 파일로 직렬화 → iOS Files 앱 / Android 파일 공유 시트로 저장
- **가져오기**: JSON 파일 선택 → 덮어쓰기(전체 교체) 또는 병합(기존 유지 + 신규 추가) 선택 후 복원
- 백업 파일 포맷: `vibediary-backup-YYYYMMDD.json`

## Capabilities

### New Capabilities
- `data-backup`: JSON 파일 내보내기 — children, records, tags 전체 직렬화 및 Files 앱 공유
- `data-restore`: JSON 파일 가져오기 — 덮어쓰기/병합 두 가지 복원 모드

### Modified Capabilities
- (없음)

## Impact

- **새 파일**: `src/services/backupService.ts` — 직렬화/역직렬화, 파일 공유, 복원 로직
- **수정**: `src/screens/SettingsScreen.tsx` — 백업/복원 섹션 UI 추가
- **DB 읽기**: `src/db/recordsDao.ts`, children/tags DAO — 전체 조회 쿼리
- **의존성 추가**: `expo-document-picker` (파일 선택), `expo-sharing` (파일 공유)
- **데이터 무결성**: 복원 시 childId 충돌, 중복 recordId 처리 필요
