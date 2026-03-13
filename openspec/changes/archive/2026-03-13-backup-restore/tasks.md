## 1. 의존성 설치

- [x] 1.1 `expo-sharing`, `expo-document-picker` 패키지 설치
- [x] 1.2 `app.json` Android permissions에 `READ_EXTERNAL_STORAGE` 추가
- [x] 1.3 `npx tsc --noEmit` 통과 확인

## 2. backupService.ts 구현

- [x] 2.1 `src/services/backupService.ts` 파일 생성 및 `BackupData` 인터페이스 정의 (`version`, `exportedAt`, `children`, `records`, `tags`, `recordTags`)
- [x] 2.2 `exportBackup()`: 전체 DB 조회 → JSON 직렬화 (embedding 제외) → `cacheDirectory`에 임시 파일 저장 → `Sharing.shareAsync()` 호출
- [x] 2.3 `importBackup(mode: 'overwrite' | 'merge')`: `DocumentPicker.getDocumentAsync()` → 파일 읽기 → JSON 파싱 및 유효성 검증 (`version` 필드 확인)
- [x] 2.4 `restoreOverwrite()`: 기존 DB 전체 삭제(children, records, tags, record_tags) → 백업 데이터 순서대로 INSERT (children → tags → records → record_tags), `ai_pending = 1` 설정
- [x] 2.5 `restoreMerge()`: child id 충돌 감지 → 충돌 시 새 UUID 생성 및 records child_id 업데이트 → 중복 record id 건너뜀 → tag name UNIQUE 충돌 시 기존 tag id 사용, `ai_pending = 1` 설정
- [x] 2.6 유효하지 않은 파일 선택 시 에러 throw

## 3. SettingsScreen UI 추가

- [x] 3.1 `backupService` import 및 `handleExport`, `handleImport` 콜백 추가
- [x] 3.2 설정 화면에 "데이터 백업/복원" 섹션 추가 (내보내기 버튼, 가져오기 버튼)
- [x] 3.3 가져오기 시 덮어쓰기/병합 선택 `Alert` 다이얼로그 구현
- [x] 3.4 덮어쓰기 선택 시 "기존 데이터가 모두 삭제됩니다" 2차 확인 `Alert` 추가
- [x] 3.5 로딩 중 버튼 비활성화 및 ActivityIndicator 표시
- [x] 3.6 완료/오류 시 `Alert` 메시지 표시

## 4. DB DAO 보완

- [x] 4.1 `recordsDao.ts`에 전체 records 조회 함수 추가 (childId 필터 없이 전체)
- [x] 4.2 `childrenDao.ts`에 전체 children 조회 함수 확인 또는 추가
- [x] 4.3 `tagsDao.ts`에 전체 tags 및 record_tags 조회 함수 추가

## 5. 검증

- [x] 5.1 `npx tsc --noEmit` 타입 에러 없음 확인
- [ ] 5.2 내보내기 → Files 앱 저장 수동 테스트
- [ ] 5.3 덮어쓰기 복원: 내보낸 파일로 앱 재설치 후 복원 수동 테스트
- [ ] 5.4 병합 복원: 일부 기록 삭제 후 병합 복원 시 삭제된 기록만 복구 확인
- [ ] 5.5 잘못된 JSON 파일 선택 시 에러 메시지 표시 확인
