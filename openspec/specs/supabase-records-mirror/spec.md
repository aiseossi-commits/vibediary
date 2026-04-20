## Purpose

로컬 SQLite records를 Supabase에 백그라운드 동기화하여 가족 공유 및 다기기 접근을 지원한다.

---

## Requirements

### Requirement: 로컬 저장 후 Supabase 백그라운드 동기화
records, tags, record_tags, children 저장 시 SQLite에 먼저 쓰고(SHALL), 이후 비동기로 Supabase에 upsert해야 한다(SHALL). 동기화 성공 시 records.is_synced = 1로 업데이트해야 한다(SHALL).

#### Scenario: 온라인 상태에서 기록 저장
- **WHEN** 사용자가 기록을 저장하고 네트워크가 연결되어 있을 때
- **THEN** SQLite에 저장 완료 후 백그라운드에서 Supabase에 upsert하고 is_synced = 1로 업데이트한다

#### Scenario: 오프라인 상태에서 기록 저장
- **WHEN** 사용자가 기록을 저장하고 네트워크가 연결되지 않았을 때
- **THEN** SQLite에 is_synced = 0으로 저장하고, 앱 사용에 지장 없이 계속 동작한다

#### Scenario: 오프라인 후 온라인 복구
- **WHEN** 네트워크 연결이 복구될 때
- **THEN** is_synced = 0인 records를 Supabase에 일괄 업로드하고 is_synced = 1로 업데이트한다

### Requirement: Supabase records 테이블 스키마
Supabase records 테이블은 로컬 SQLite records 테이블과 1:1 매핑되어야 하며(SHALL), user_id(auth.uid())와 family_id(소속 가족방 ID)를 추가 컬럼으로 가져야 한다(SHALL). tags, record_tags, children도 동일 패턴으로 미러링한다(SHALL).

#### Scenario: records 테이블 upsert
- **WHEN** syncRecord(recordId)가 호출될 때
- **THEN** 로컬 record를 user_id, family_id를 포함해 Supabase에 ON CONFLICT(id) DO UPDATE로 upsert한다

#### Scenario: 중복 동기화 멱등성
- **WHEN** 같은 record가 두 번 이상 syncRecord 호출될 때
- **THEN** upsert로 처리되어 데이터 중복 없이 최신값으로 갱신된다

### Requirement: 최초 마이그레이션 (기존 기록 일괄 업로드)
앱 업데이트 후 첫 실행 시 기존 로컬 records를 Supabase에 일괄 업로드해야 한다(SHALL). 50건씩 배치로 처리하며 백그라운드에서 실행되어야 한다(SHALL). 마이그레이션 실패 시 앱 동작에 영향을 주지 않아야 한다(SHALL).

#### Scenario: 최초 마이그레이션 실행
- **WHEN** 앱이 is_initial_migration_done = false인 상태로 시작될 때
- **THEN** 백그라운드에서 is_synced = 0인 records를 50건씩 Supabase에 업로드한다

#### Scenario: 마이그레이션 완료 표시
- **WHEN** 모든 기존 records 업로드가 완료될 때
- **THEN** appSettings에 is_initial_migration_done = true를 저장하여 재실행을 방지한다

#### Scenario: 마이그레이션 중 오류 발생
- **WHEN** 배치 처리 중 네트워크 오류가 발생할 때
- **THEN** 해당 배치를 건너뛰고 마이그레이션 완료로 표시하여 앱 정상 동작을 유지한다

### Requirement: RLS 정책 — 본인 기록 CRUD
Supabase records 테이블에 RLS를 적용하여(SHALL) 인증된 사용자는 자신의 records(user_id = auth.uid())만 INSERT/UPDATE/DELETE할 수 있어야 한다(SHALL).

#### Scenario: 본인 기록 쓰기
- **WHEN** 인증된 사용자가 자신의 user_id로 record를 upsert할 때
- **THEN** RLS를 통과하여 정상 저장된다

#### Scenario: 타인 기록 수정 시도
- **WHEN** 인증된 사용자가 다른 user_id의 record를 수정하려 할 때
- **THEN** RLS에 의해 거부된다
