# Family Sync 재설계 문서 (v2 — minimal)

> **상태**: 설계 후보 확정 — Supabase Auth 영구 인증 흐름 검증 후 구현 착수  
> **작성일**: 2026-04-26 (v2 갱신 2026-04-27)  
> **원칙**: 진짜 문제만 푼다. 부가 기능은 미래로 미룬다.

---

## 0. 문서의 전제

### 0.1 진짜 문제 (단 하나)

> 익명 `auth.uid()`가 디바이스+세션 단위로 휘발 → `user_id = auth.uid()` 기반 RLS 붕괴 → 가족방 sync 전체 실패.

### 0.2 진짜 해법 (단 셋)

1. **영구 인증** — 가족방 가입 시 Apple/Google/Email 로그인 필수
2. **family_id 기반 RLS** — `auth.uid()` 직접 비교 제거, `family_members` 멤버십 게이트
3. **로컬 family_id 백필** — 가족방 가입 시점의 로컬 데이터를 family_id로 귀속

### 0.3 절대 만들지 않는 것 (이번 단계)

- ❌ Role 시스템 (owner/member/viewer)
- ❌ 권한 매트릭스 / 차등 삭제 권한
- ❌ Owner 이전 / 마지막 owner 탈퇴 처리
- ❌ Subscription / 결제 게이트
- ❌ Invite code 만료 / single-use
- ❌ Cascade 삭제 정책
- ❌ Reactions / comments 등 미래 기능

이유: 가족방은 **신뢰 기반 동등 권한**이 자연스럽고, B2B 협업툴 패턴은 감정선에 안 맞음.  
필요해지면 그때 ALTER TABLE로 추가.

---

## 1. 현재 시스템 진단

### 1.1 근본 원인

익명 인증의 user_id 특성:
- 디바이스별로 새 UUID 생성
- 앱 삭제 / 핸드폰 교체 시 ID 사망
- 로그아웃 → 재로그인 시 새 ID

결과:
- 기계1에서 올린 children/records → `user_id = 'abc-123'`
- 기계1을 교체하면 → `user_id = 'xyz-789'`
- RLS `WITH CHECK (user_id = auth.uid())` → 자신이 올린 행을 UPDATE 불가 (42501)
- 영구적으로 고아 데이터 발생

### 1.2 파생 버그

| 버그 | 진짜 원인 |
|------|-----------|
| children 동기화 안됨 | user_id 불일치로 UPDATE 42501 |
| records 동기화 안됨 | child_id FK + user_id 불일치 |
| tags 22P02 오류 | integer PK → UUID 마이그레이션 미완성 (별건, 해결됨) |
| 삭제 전파 안됨 | 삭제 tombstone 메커니즘 없음 |
| 가족방 참여 후 기존 기록 안 올라감 | markAllLocalDirty() 호출 누락 |
| 재동기화 후 UI 미갱신 | wakeSync fire-and-forget |

핵심 문제(user_id 휘발성)는 패치 불가 — 재설계만이 답.

---

## 2. 핵심 설계 결정

### 2.1 인증

- 앱 최초 실행 → 익명 auth로 로컬 전용 사용 (현재 그대로)
- 가족방 생성 / 참여 → **영구 인증 필수** (Apple / Google / Email 중 택)
- 핵심 요구사항: **가족방 멤버십에 저장되는 user_id가 재설치/기기교체 후에도 복구 가능한 영구 `auth.uid`여야 한다.**
- 구현 방법: Supabase Auth의 `linkIdentity` 또는 provider sign-in 흐름 — **둘 중 어느 쪽이 anonymous user.id를 보존하는지 / 새 계정으로 합쳐지는지 / 충돌 처리는 어떻게 되는지를 Phase 0에서 실측 검증 후 결정**.

### 2.2 가족방 데이터 소유

- 행의 소유자 = `family_id`
- `created_by` / `updated_by` = 메타데이터 (UI 표시용, RLS 결정 미관여)
- 가족 구성원 전원 = **동등 권한** (읽기 / 쓰기 / 삭제 모두 자유)
- 신뢰 기반 모델 — role 없음, owner 없음

### 2.3 RLS 핵심 조건

```sql
-- 모든 sync 테이블 동일 패턴
USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
```

- `auth.uid()` = 영구 계정의 고정 UUID → 기기 교체와 무관
- RLS에 `user_id = auth.uid()` 직접 비교 **없음**
- `family_members`가 단일 멤버십 게이트키퍼

### 2.4 가족방 탈퇴

- `family_members`에서 해당 user_id 행 제거
- 기존 데이터는 family_id를 유지하며 잔류
- 마지막 멤버가 떠나면 `families.is_active = false`로 마킹 (하드 삭제 안 함)
- **소유권 이전 / 강제 차단 로직 없음** — 가족 앱에 과한 패턴

### 2.5 익명 데이터 클레임

- 신규 기기 → 익명 시작
- 가족방 화면에서 영구 로그인 (Apple/Google) → 동일 영구 UID 반환
- `family_members`에 해당 UID 있음 → 기존 가족방 데이터 자동 접근
- sync 엔진이 서버 → 로컬 다운로드 실행

### 2.6 삭제 — soft delete

- 모든 sync 테이블에 `deleted_at` 컬럼
- 삭제 시 `deleted_at = NOW()` + `is_synced = 0`
- 조회 시 `WHERE deleted_at IS NULL`
- **Cascade 없음** — child 삭제는 child 행 1개만 deleted_at 마킹. 하위 records는 그대로
- 복구 = `deleted_at = NULL` (단일 row)
- `family_deletes` tombstone 테이블 **제거** (소프트 삭제로 대체)

### 2.7 충돌 정책 — LWW (last-write-wins)

- `updated_at` 더 큰 쪽이 이김
- 동일 `updated_at`이면 서버 값 유지
- 별도 코드 추가 없음. Supabase upsert 자연 동작 + `updated_at` 바운스

### 2.8 무료 vs 유료

- **현 단계 결정 안 함** — 영구 로그인 = 가족방 사용 가능. 결제 게이트는 진짜 결제 도입할 때 추가
- 무료/유료 분리는 향후 `subscriptions` 테이블 별도 추가로 처리

### 2.9 초대 코드

- 8자리 랜덤 base32 (혼동 문자 0/O/1/I 제거)
- 만료 없음
- 단회용 아님
- owner 없음 → **가족방 생성자 또는 멤버 누구나 재발급 가능**
- 재발급 시 이전 코드 무효화

---

## 3. 데이터 모델

### 3.1 Supabase

```sql
-- 가족방 (owner 컬럼 없음)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 멤버십 (role 없음 — 모두 동등)
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- sync 테이블 공통 컬럼 (모든 sync table에 동일 적용)
-- family_id UUID NOT NULL REFERENCES families(id)
-- created_by UUID REFERENCES auth.users(id)
-- updated_by UUID REFERENCES auth.users(id)
-- deleted_at TIMESTAMPTZ
-- created_at / updated_at TIMESTAMPTZ

-- 예시: children
CREATE TABLE children (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  birth_date TEXT,
  avatar_emoji TEXT,
  color TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**적용 대상 테이블** (10개):
`children`, `records`, `tags`, `record_tags`, `milestones`, `medications`, `event_daily_logs`, `care_routines`, `growth_records`, `development_assessments`, `wiki_pages`

### 3.2 user_id 컬럼 처리 — 점진적 deprecated

- **즉시 DROP 금지**
- Phase 1: `created_by = user_id` 백필 → 코드 전환
- Phase 2: 코드 전환 완료 확인 후 `user_id` 컬럼 deprecated 마킹
- Phase 3: 안정 운영 후 DROP

### 3.3 가족방 없는 익명 사용자

- Supabase 업로드 없음 (sync 엔진 skip)
- SQLite 로컬에 `family_id = NULL`로 누적
- 가족방 가입 시 일괄 백필 후 업로드

---

## 4. RLS 정책

### 4.1 헬퍼 함수

```sql
CREATE OR REPLACE FUNCTION user_family_ids()
RETURNS SETOF UUID AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

`SECURITY DEFINER` 사용 이유: `family_members` 자체의 RLS를 우회하여 `user_family_ids()`가 동작하도록.

### 4.2 family_members 자체 RLS

```sql
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 본인 멤버십과 같은 family의 다른 멤버를 볼 수 있음
CREATE POLICY "members_select" ON family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- 가입은 별도 함수(join_family_by_code)로만 처리. 직접 INSERT 차단
CREATE POLICY "members_insert_self" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 본인 멤버십만 삭제 가능 (탈퇴)
CREATE POLICY "members_delete_self" ON family_members
  FOR DELETE USING (user_id = auth.uid());
```

### 4.3 families 자체 RLS

```sql
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_select" ON families
  FOR SELECT USING (id IN (SELECT user_family_ids()));

-- 생성/수정은 멤버 누구나
CREATE POLICY "families_insert" ON families
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "families_update" ON families
  FOR UPDATE USING (id IN (SELECT user_family_ids()))
  WITH CHECK (id IN (SELECT user_family_ids()));
```

### 4.4 sync 테이블 RLS (10개 테이블 동일)

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fm_select" ON <table>
  FOR SELECT USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY "fm_insert" ON <table>
  FOR INSERT WITH CHECK (family_id IN (SELECT user_family_ids()));

CREATE POLICY "fm_update" ON <table>
  FOR UPDATE USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));

CREATE POLICY "fm_delete" ON <table>
  FOR DELETE USING (family_id IN (SELECT user_family_ids()));
```

**예외 — tags**: 시스템 태그(`family_id IS NULL`)는 모든 사용자가 read-only.
```sql
CREATE POLICY "tags_select_with_system" ON tags
  FOR SELECT USING (
    family_id IS NULL
    OR family_id IN (SELECT user_family_ids())
  );

CREATE POLICY "tags_insert" ON tags
  FOR INSERT WITH CHECK (family_id IN (SELECT user_family_ids()));
-- update/delete: 커스텀 태그만 가능 (family_id NOT NULL)
```

### 4.5 Storage bucket RLS

`audio` bucket의 파일 경로 규칙: `{family_id}/{record_id}.m4a`

```sql
-- INSERT: 자신의 family 폴더에만 업로드 가능
CREATE POLICY "audio_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT user_family_ids())
  );

-- SELECT/UPDATE/DELETE 동일 패턴
```

---

## 5. SQLite 로컬 스키마 (DB v24)

```sql
-- 모든 sync 테이블에 추가
ALTER TABLE children ADD COLUMN family_id TEXT;
ALTER TABLE children ADD COLUMN created_by TEXT;
ALTER TABLE children ADD COLUMN updated_by TEXT;
ALTER TABLE children ADD COLUMN deleted_at INTEGER;  -- Unix ms

-- 동일 적용: records, tags, record_tags, milestones, medications,
-- event_daily_logs, care_routines, growth_records, development_assessments, wiki_pages

-- family_deletes 제거 (소프트 삭제로 대체)
DROP TABLE IF EXISTS family_deletes;
```

---

## 6. Sync 엔진 변경

### 6.1 인증 게이트

```typescript
async function syncPendingRecords() {
  const session = await getSession();
  if (!session || session.user.is_anonymous) {
    return { skipped: 'anonymous_user' };
  }
  const activeFamilyId = await getActiveFamilyId();
  if (!activeFamilyId) return { skipped: 'no_family' };
  // ... 기존 로직
}
```

### 6.2 Upload payload 변경

```typescript
// 이전: .upsert({ ...row, user_id: session.user.id })
.upsert({
  ...row,
  family_id: activeFamilyId,
  updated_by: session.user.id,
  // user_id는 백필용으로 유지하되 새 INSERT에서는 채우지 않음
})
```

### 6.3 Soft delete 전파

- 업로드: `is_synced = 0` 필터 (deleted_at 변경분 자동 포함)
- 다운로드: `deleted_at IS NOT NULL` 행 → 로컬 deleted_at 업데이트
- 모든 DAO 조회: `WHERE deleted_at IS NULL` 강제

### 6.4 family_deletes 제거

- `syncFamilyDeletes()` 함수 삭제
- Supabase `family_deletes` 테이블 DROP
- 삭제 전파 = 일반 sync 경로

### 6.5 충돌 — LWW

- Supabase upsert가 자동으로 last-write-wins 처리
- `updated_at`은 항상 클라이언트 측에서 `Date.now()`로 갱신
- 별도 충돌 해결 코드 없음

---

## 7. 로컬 데이터 family_id 승격 절차

가족방 생성 / 참여 직후 클라이언트에서 실행:

```typescript
async function promoteLocalDataToFamily(familyId: string, userId: string) {
  await db.transaction(async tx => {
    for (const table of SYNC_TABLES) {
      await tx.execute(`
        UPDATE ${table}
        SET family_id = ?,
            created_by = COALESCE(created_by, ?),
            updated_by = ?,
            is_synced = 0,
            updated_at = ?
        WHERE family_id IS NULL
      `, [familyId, userId, userId, Date.now()]);
    }
  });
  await wakeSync('family_promoted');
}
```

순서:
1. 영구 인증 완료
2. `families` row 생성 또는 가입
3. `family_members` row 추가
4. **`promoteLocalDataToFamily()` 실행** ← 여기
5. `wakeSync()` 자동 트리거 → 모든 row 업로드

---

## 8. 기존 서버 데이터 처리 — Archive 우선

**절대 금지**: 운영 환경에서 `DELETE FROM ...` 직접 실행

**필수 순서**:
1. **Backup** — Supabase 콘솔에서 전체 dump 또는 테이블별 export
2. **Dry-run SELECT** — 삭제 대상 row를 먼저 SELECT로 확인
3. **Archive table 생성** — `<table>_archive_20260427` 형태로 복제 후 데이터 이동
4. **검증** — archive에 정상 보관됐는지 확인
5. **선택적 DELETE** — 검증 후 필요하면 원본에서 제거

```sql
-- 예시: children
CREATE TABLE children_archive_20260427 AS
  SELECT * FROM children WHERE family_id IS NULL OR family_id NOT IN (SELECT id FROM families);
-- 검증 후
-- DELETE FROM children WHERE id IN (SELECT id FROM children_archive_20260427);
```

현 단계는 **테스트 환경**이라 archive까지만 진행하면 충분.

---

## 9. 마이그레이션 단계

### Phase 0 — 사전 검증 (구현 착수 전 필수)
- [ ] **Supabase Auth 영구 인증 흐름 실측 검증**
  - Apple Sign-In: anonymous → permanent 시 user.id 보존 여부
  - 동일 Apple ID로 다른 기기에서 로그인: 동일 user.id 반환 여부
  - linkIdentity API 동작 확인 (Supabase 버전별 차이 가능)
- [ ] 검증 결과 문서화 (이 파일에 추가)
- [ ] 검증 통과 → Phase 1 진행. 미통과 → 인증 모델 재설계

### Phase 1 — Supabase 스키마 (SQL)
1. 모든 sync 테이블에 `family_id`, `created_by`, `updated_by`, `deleted_at` 컬럼 추가
2. `families` 테이블에서 `owner_id` 제거 (있다면), `created_by` 컬럼 추가
3. `family_members.role` 컬럼 제거 (있다면)
4. `created_by = user_id` 백필 (기존 데이터 보존)
5. 기존 RLS 정책 전체 DROP
6. `user_family_ids()` 헬퍼 함수 생성
7. 새 RLS 정책 적용 (sync 테이블 + families + family_members + Storage)
8. `family_deletes` 테이블 archive 후 DROP
9. 오염 데이터 archive (Section 8 절차)

### Phase 2 — 클라이언트 코드
1. `syncService.ts` — upload payload 변경, `user_id` 필드 제거 (created_by/updated_by로 전환)
2. 모든 DAO — `WHERE deleted_at IS NULL` 필터 추가
3. `FamilyShareScreen` — 영구 인증 게이트 추가
4. `AuthContext` — 익명/영구 계정 구분 상태 추가
5. `promoteLocalDataToFamily()` 함수 구현
6. `syncFamilyDeletes()` 제거
7. SQLite DB v24 마이그레이션

### Phase 3 — 빌드 + 검증
1. versionCode 빌드 시점에 결정 (현재 27 다음 번호)
2. 시나리오 1~10 실기기 검증
3. 통과 후 commit + STATE.md 갱신

### Phase 4 (미래, 별건)
- user_id 컬럼 DROP
- 결제 게이트 도입
- role 시스템 도입 (필요 시)
- reactions / comments

---

## 10. 검증 시나리오

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 기기A에서 영구 로그인 후 가족방 생성 | families + family_members 행 생성, 영구 UID 저장 |
| 2 | 기기B에서 영구 로그인 후 초대 코드 참여 | family_members에 기기B user_id 추가, sync 시작 |
| 3 | 기기A 녹음 → 기기B에서 표시 | records 업로드 → 기기B 다운로드 |
| 4 | 기기A에서 record 삭제 → 기기B에서 사라짐 | deleted_at 설정 → 기기B sync 후 hidden |
| 5 | 기기A 핸드폰 교체 → 새 기기에서 동일 영구 로그인 | 동일 UID 반환 → 가족방 데이터 자동 접근 |
| 6 | 기기A에서 아이 이름 수정 → 기기B에서 반영 | children updated_at 갱신 → 기기B 다운로드 |
| 7 | 기기B 탈퇴 → 기기A에서 기기B의 기록 잔류 | family_members 제거, records 유지 |
| 8 | 오프라인 녹음 → 온라인 복구 후 sync | is_synced=0 → 온라인 감지 → wakeSync |
| 9 | 익명 사용자가 가족방 생성/참여 시도 | 영구 인증 모달 표시 |
| 10 | 마지막 멤버 탈퇴 | family_members 제거 + families.is_active = false |

---

## 11. 미결 / 미래 항목

| 항목 | 시점 |
|------|------|
| Apple Sign-In / Google Sign-In 우선순위 | Phase 0 검증 후 결정 |
| 결제 게이트 (구독 모델) | 별도 Phase (미정) |
| Role 시스템 (필요 시) | 별도 Phase (미정) |
| Reactions / comments | 별도 Phase (미정) |
| user_id 컬럼 hard DROP | 안정 운영 확인 후 |
| Invite code 만료 / 재발급 UX | 운영 피드백 후 |

---

## 12. 작업량 추정

| Phase | 예상 시간 |
|-------|-----------|
| Phase 0 (Auth 검증) | 1시간 |
| Phase 1 (Supabase SQL) | 1시간 |
| Phase 2 (클라이언트 코드) | 2시간 |
| Phase 3 (빌드 + 검증) | 1시간 |
| **합계** | **5시간** |

---

_이 문서가 확정되고 Phase 0 검증을 통과하면 `family-sync-design.md` (1세대) 및 본 문서 v1 흔적은 `archive/`로 이동._
