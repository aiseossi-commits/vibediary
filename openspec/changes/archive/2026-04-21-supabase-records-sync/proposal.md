## Why

로컬 SQLite만으로는 가족방 멤버 간 기록 공유가 불가능하다. Supabase에 records/tags/children을 미러링하면 같은 가족방 멤버들이 서로의 돌봄 기록을 실시간으로 조회할 수 있고, 기기를 바꿔도 데이터가 유지된다.

## What Changes

- records, tags, record_tags, children 테이블을 Supabase PostgreSQL에 생성
- 로컬 쓰기 후 백그라운드에서 Supabase에 동기화 (SQLite-first, Supabase-mirror)
- 오프라인 시 기존 offlineQueue 방식으로 로컬 저장 → 온라인 복구 시 자동 업로드
- 가족방 멤버의 records를 Supabase에서 조회하는 FamilyFeedScreen 추가
- RLS: 본인 기록 CRUD + 가족방 멤버 records SELECT 허용

## Capabilities

### New Capabilities
- `supabase-records-mirror`: 로컬 records/tags/children → Supabase 동기화 (쓰기 후 백그라운드 업로드)
- `family-feed`: 가족방 멤버 전체의 기록을 Supabase에서 조회·표시하는 피드

### Modified Capabilities
- `family-room`: 가족방 기능에 "함께 보기" 탭 또는 진입점 추가 (기존 초대코드 공유에서 실제 기록 공유로 확장)

## Impact

- `src/services/syncService.ts` 신규: Supabase 동기화 로직
- `src/screens/FamilyFeedScreen.tsx` 신규: 가족 기록 피드
- `src/db/recordsDao.ts`, `src/services/recordPipeline.ts`: 저장 후 sync 트리거
- Supabase: records/tags/record_tags/children 테이블 + RLS 정책
- 기존 offlineQueue는 유지 (Supabase 동기화 실패 시 재시도 큐로 재활용)
