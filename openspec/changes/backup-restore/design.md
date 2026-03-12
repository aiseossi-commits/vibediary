## Context

expo-sqlite DB(`children`, `records`, `tags`, `record_tags`)가 기기 로컬에만 저장된다. 폰 교체나 앱 재설치 시 전체 데이터가 유실되며 현재 이전 수단이 없다. `backupService.ts`를 신규 도입해 직렬화/역직렬화 및 파일 I/O를 담당하게 하고, `SettingsScreen`에 UI를 추가한다.

## Goals / Non-Goals

**Goals:**
- 전체 기록(children, records, tags)을 JSON 파일로 내보내기 → Files 앱 / 공유 시트
- JSON 파일 가져오기: 덮어쓰기(전체 교체) 또는 병합(기존 유지 + 신규 추가) 두 모드 지원
- `audio_path`는 파일 경로만 저장 (오디오 바이너리는 백업 제외)
- `embedding` BLOB은 백업 제외 (복원 후 AI 재처리로 재생성)

**Non-Goals:**
- 클라우드 동기화 (iCloud, Google Drive 직접 연동)
- 오디오 파일 백업
- 자동 백업 스케줄링
- 부분 백업 (날짜 범위, 특정 아이만)

## Decisions

### D1. 파일 포맷: JSON (버전 포함)
```json
{
  "version": 1,
  "exportedAt": 1234567890,
  "children": [...],
  "records": [...],
  "tags": [...],
  "recordTags": [...]
}
```
`version` 필드로 향후 스키마 변경 시 마이그레이션 가능. 대안(SQLite 파일 복사)은 앱 재설치 시 경로 변경 문제가 있어 제외.

### D2. 파일 공유: expo-sharing
`FileSystem.writeAsStringAsync`로 `cacheDirectory`에 임시 파일 생성 후 `Sharing.shareAsync()`로 시스템 공유 시트 표시. iOS Files 앱 저장, AirDrop, 이메일 모두 지원. `expo-file-system/legacy` 이미 사용 중이므로 신규 의존성은 `expo-sharing`만 추가.

### D3. 파일 가져오기: expo-document-picker
`DocumentPicker.getDocumentAsync({ type: 'application/json' })`으로 파일 선택 → `FileSystem.readAsStringAsync`로 읽기. 신규 의존성 `expo-document-picker` 추가 필요.

### D4. 병합 전략
- **덮어쓰기**: DB 전체 DROP 후 INSERT (간단, 데이터 무결성 보장)
- **병합**: `id` 기준 중복 제외, 신규 레코드만 INSERT. `child_id` 참조 무결성을 위해 children 먼저 삽입. 기존 tags는 name UNIQUE 제약으로 충돌 시 IGNORE.
- 두 모드 모두 복원 전 확인 다이얼로그 표시.

### D5. embedding 처리
복원된 records의 `embedding`은 NULL로 저장. `ai_pending = 1`로 설정해 offlineQueue가 AI 재처리하도록 유도. (offlineQueue는 기존 파이프라인 활용)

## Risks / Trade-offs

- **대용량 JSON**: 기록 수천 건 시 직렬화/역직렬화 지연 → 로딩 인디케이터로 UX 대응
- **병합 시 childId 충돌**: 다른 기기에서 생성한 child.id가 현재 기기와 같을 가능성 낮지만 존재 → 병합 시 child.id 충돌이면 새 id 생성 후 해당 records의 child_id 업데이트
- **오디오 파일 경로 불일치**: 복원 후 `audio_path`가 가리키는 파일 없음 → UI에서 오디오 재생 실패 시 "파일 없음" 처리 (기존 에러 핸들링 활용)
- **expo-document-picker 권한**: Android에서 READ_EXTERNAL_STORAGE 필요 → `app.json` permissions 추가

## Migration Plan

1. `expo-sharing`, `expo-document-picker` 패키지 설치
2. `backupService.ts` 구현 (내보내기/가져오기/직렬화)
3. `SettingsScreen` UI 추가 (백업/복원 섹션, 덮어쓰기/병합 선택 모달)
4. `app.json` Android 권한 추가
5. 수동 테스트: 내보내기 → 앱 재설치 → 덮어쓰기 복원, 병합 복원

롤백: 기능 자체가 추가이므로 롤백은 파일 삭제만으로 가능. DB 스키마 변경 없음.

## Open Questions

- 병합 모드에서 child.id 충돌 시 새 UUID 생성 vs 기존 child에 병합? → **새 UUID 생성**으로 결정 (단순성 우선)
- 백업 파일명 날짜 포맷: `vibediary-backup-20260313.json` vs `vibediary-backup-2026-03-13T09:00.json` → **YYYYMMDD** (파일 시스템 호환성)
