## Context

현재 앱은 SQLite를 단독 데이터 저장소로 사용한다. 가족방 기능(1단계)은 구현됐지만 실제 돌봄 기록은 공유되지 않는다. records/tags/children을 Supabase에 미러링하면 가족방 멤버 간 실시간 기록 공유가 가능해진다.

기존 offlineQueue는 STT/AI 처리 재시도용으로 존재하며, 이번 작업에서는 Supabase 동기화 실패 처리를 위한 별도 syncQueue 개념으로 확장한다.

## Goals / Non-Goals

**Goals:**
- 로컬 쓰기 후 백그라운드에서 Supabase에 records/tags/children 동기화
- 가족방 멤버 기록을 Supabase에서 조회하는 Family Feed 화면 추가
- 오프라인 시 로컬 저장만 하고 온라인 복구 시 자동 업로드
- 기존 로컬 기록 최초 1회 Supabase 업로드 (마이그레이션)

**Non-Goals:**
- 실시간 sync (WebSocket/Realtime) — 가족 피드는 수동 새로고침
- Supabase → 로컬 다운싱크 (가족 기록은 Supabase에서만 조회)
- 충돌 해결 (같은 기록 동시 수정 불가 — 각자 자기 기록만 씀)
- 기존 offlineQueue 제거

## Decisions

### D1. SQLite-first, Supabase-mirror 구조
로컬 SQLite가 primary store. 저장 성공 후 비동기로 Supabase에 upsert. 네트워크 오류 시 `sync_pending` 플래그를 records에 추가해 나중에 재시도.

대안: Supabase-first (로컬 캐시) → 오프라인 시 UX 복잡도 너무 높음. 기존 아키텍처 변경 최소화 원칙에서 SQLite-first 채택.

### D2. is_synced 컬럼 재활용
records 테이블에 이미 `is_synced INTEGER DEFAULT 0` 컬럼 존재. 현재 미사용. 이 컬럼으로 Supabase 동기화 완료 여부를 표시. 0 = 미동기화, 1 = 동기화 완료.

### D3. Supabase records 테이블 스키마
로컬 SQLite records와 1:1 매핑. 추가 컬럼: `user_id UUID` (auth.uid()), `family_id UUID` (소속 가족방).

tags, record_tags, children도 동일 패턴으로 미러링.

### D4. 가족 피드는 Supabase 직접 조회
가족 멤버 기록은 로컬에 내려받지 않음. FamilyFeedScreen에서 Supabase를 직접 쿼리. RLS로 같은 family_id 멤버의 records만 노출.

### D5. 최초 마이그레이션
앱 업데이트 후 첫 실행 시 기존 로컬 records를 Supabase에 일괄 업로드. 진행률 표시 없이 백그라운드 처리 (실패해도 앱 동작에 지장 없음).

### D6. syncService 신규 파일
`src/services/syncService.ts`에 동기화 로직 집중:
- `syncRecord(recordId)` — 단일 기록 Supabase upsert
- `syncPendingRecords()` — is_synced=0 기록 일괄 업로드
- `runInitialMigration()` — 앱 업데이트 후 최초 1회 실행

## Risks / Trade-offs

- **Supabase 스키마 복잡도**: tags/record_tags 관계 테이블 RLS가 까다로움 → SECURITY DEFINER 함수로 처리
- **중복 동기화**: 같은 기록이 두 번 업로드될 수 있음 → upsert(ON CONFLICT DO UPDATE)로 멱등성 보장
- **대용량 초기 마이그레이션**: 기존 기록이 많으면 느릴 수 있음 → 백그라운드 배치 처리 (50건씩)
- **가족 피드 무한 스크롤**: Supabase query 페이지네이션 필요 → 최신 50건 우선, 더 보기 버튼

## Open Questions

- 가족 피드에서 다른 멤버 기록 수정/삭제 허용 여부? (현재: 본인 기록만 수정 가능으로 가정)
- children(바다) 정보도 공유? 가족방이 같으면 같은 아이를 돌본다고 가정 → children도 공유
