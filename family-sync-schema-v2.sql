-- =========================================================
-- VibeDiary Family Sync Schema v2
-- 적용: Supabase SQL Editor에서 순서대로 실행
-- 사전 준비: Supabase 콘솔에서 Apple Sign-In provider 활성화 필요
-- =========================================================

-- =========================================================
-- STEP 0: 기존 오염 데이터 archive (실행 전 반드시 백업)
-- =========================================================

-- 현재 모든 테이블 데이터 확인 (dry-run)
-- SELECT 'families' as tbl, count(*) FROM families
-- UNION ALL SELECT 'family_members', count(*) FROM family_members
-- UNION ALL SELECT 'children', count(*) FROM children
-- UNION ALL SELECT 'records', count(*) FROM records;

-- archive 테이블 생성 (기존 데이터 보존)
CREATE TABLE IF NOT EXISTS children_archive_20260427 AS SELECT * FROM children;
CREATE TABLE IF NOT EXISTS records_archive_20260427 AS SELECT * FROM records;
CREATE TABLE IF NOT EXISTS tags_archive_20260427 AS SELECT * FROM tags;
CREATE TABLE IF NOT EXISTS family_members_archive_20260427 AS SELECT * FROM family_members;
CREATE TABLE IF NOT EXISTS families_archive_20260427 AS SELECT * FROM families;

-- 검증 후 기존 데이터 삭제 (archive 확인 후 실행)
-- DELETE FROM records;
-- DELETE FROM tags;
-- DELETE FROM children;
-- DELETE FROM family_members;
-- DELETE FROM families;

-- =========================================================
-- STEP 1: families 테이블 재구성
-- =========================================================

-- owner_id 제거, created_by로 통일 (owner 개념 없음 — 모든 멤버 동등)
ALTER TABLE families ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE families ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- owner_id가 있다면 created_by로 백필 후 제거
-- UPDATE families SET created_by = owner_id WHERE created_by IS NULL AND owner_id IS NOT NULL; -- owner_id 컬럼 없음
-- ALTER TABLE families DROP COLUMN IF EXISTS owner_id; -- 코드 전환 완료 후 실행

-- =========================================================
-- STEP 2: family_members 테이블 재구성
-- =========================================================

-- role 컬럼 제거 (모든 멤버 동등권한 — 단순화)
-- ALTER TABLE family_members DROP COLUMN IF EXISTS role; -- 존재하면 제거

-- =========================================================
-- STEP 3: sync 테이블 공통 컬럼 추가
-- =========================================================

-- children
ALTER TABLE children ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE children ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE children ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE children ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- records
ALTER TABLE records ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- active_events
ALTER TABLE active_events ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE active_events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE active_events ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE active_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- event_daily_logs
ALTER TABLE event_daily_logs ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE event_daily_logs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE event_daily_logs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE event_daily_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- event_name_presets
ALTER TABLE event_name_presets ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE event_name_presets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE event_name_presets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE event_name_presets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- hidden_default_event_names
ALTER TABLE hidden_default_event_names ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE hidden_default_event_names ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE hidden_default_event_names ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE hidden_default_event_names ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- synthesis_articles
ALTER TABLE synthesis_articles ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE synthesis_articles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE synthesis_articles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE synthesis_articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- wiki_pages
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- search_logs
ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =========================================================
-- STEP 4: user_id → created_by 백필 (기존 데이터 보존)
-- =========================================================

UPDATE children SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE records SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE tags SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE active_events SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE event_daily_logs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE event_name_presets SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE hidden_default_event_names SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE synthesis_articles SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE wiki_pages SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE search_logs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;

-- user_id 컬럼은 코드 전환 완료 후 deprecated 처리 (지금은 유지)

-- =========================================================
-- STEP 5: family_deletes 테이블 DROP (soft delete로 대체)
-- =========================================================

DROP TABLE IF EXISTS family_deletes;

-- =========================================================
-- STEP 6: RLS 정책 전면 재구성
-- =========================================================

-- 헬퍼 함수: 현재 사용자가 속한 family_id 목록
CREATE OR REPLACE FUNCTION user_family_ids()
RETURNS SETOF UUID AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----- families -----
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "families_select" ON families;
DROP POLICY IF EXISTS "families_insert" ON families;
DROP POLICY IF EXISTS "families_update" ON families;

CREATE POLICY "families_select" ON families
  FOR SELECT USING (id IN (SELECT user_family_ids()));

CREATE POLICY "families_insert" ON families
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "families_update" ON families
  FOR UPDATE USING (id IN (SELECT user_family_ids()))
  WITH CHECK (id IN (SELECT user_family_ids()));

-- ----- family_members -----
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_select" ON family_members;
DROP POLICY IF EXISTS "members_insert_self" ON family_members;
DROP POLICY IF EXISTS "members_delete_self" ON family_members;

CREATE POLICY "members_select" ON family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR family_id IN (SELECT user_family_ids())
  );

CREATE POLICY "members_insert_self" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_delete_self" ON family_members
  FOR DELETE USING (user_id = auth.uid());

-- ----- sync 테이블 공통 RLS 매크로 적용 -----
-- children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON children;
DROP POLICY IF EXISTS "fm_insert" ON children;
DROP POLICY IF EXISTS "fm_update" ON children;
DROP POLICY IF EXISTS "fm_delete" ON children;

CREATE POLICY "fm_select" ON children FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON children FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON children FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON children FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- records
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON records;
DROP POLICY IF EXISTS "fm_insert" ON records;
DROP POLICY IF EXISTS "fm_update" ON records;
DROP POLICY IF EXISTS "fm_delete" ON records;

CREATE POLICY "fm_select" ON records FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON records FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON records FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON records FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- tags (시스템 태그 = family_id IS NULL, 공통 read-only / 커스텀 태그 = family_id NOT NULL)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_select" ON tags;
DROP POLICY IF EXISTS "tags_insert" ON tags;
DROP POLICY IF EXISTS "tags_update" ON tags;
DROP POLICY IF EXISTS "tags_delete" ON tags;

CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (family_id IS NULL OR family_id IN (SELECT user_family_ids()));
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- active_events
ALTER TABLE active_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON active_events;
DROP POLICY IF EXISTS "fm_insert" ON active_events;
DROP POLICY IF EXISTS "fm_update" ON active_events;
DROP POLICY IF EXISTS "fm_delete" ON active_events;

CREATE POLICY "fm_select" ON active_events FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON active_events FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON active_events FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON active_events FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- event_daily_logs
ALTER TABLE event_daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON event_daily_logs;
DROP POLICY IF EXISTS "fm_insert" ON event_daily_logs;
DROP POLICY IF EXISTS "fm_update" ON event_daily_logs;
DROP POLICY IF EXISTS "fm_delete" ON event_daily_logs;

CREATE POLICY "fm_select" ON event_daily_logs FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON event_daily_logs FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON event_daily_logs FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON event_daily_logs FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- event_name_presets
ALTER TABLE event_name_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON event_name_presets;
DROP POLICY IF EXISTS "fm_insert" ON event_name_presets;
DROP POLICY IF EXISTS "fm_update" ON event_name_presets;
DROP POLICY IF EXISTS "fm_delete" ON event_name_presets;

CREATE POLICY "fm_select" ON event_name_presets FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON event_name_presets FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON event_name_presets FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON event_name_presets FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- hidden_default_event_names
ALTER TABLE hidden_default_event_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON hidden_default_event_names;
DROP POLICY IF EXISTS "fm_insert" ON hidden_default_event_names;
DROP POLICY IF EXISTS "fm_update" ON hidden_default_event_names;
DROP POLICY IF EXISTS "fm_delete" ON hidden_default_event_names;

CREATE POLICY "fm_select" ON hidden_default_event_names FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON hidden_default_event_names FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON hidden_default_event_names FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON hidden_default_event_names FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- synthesis_articles
ALTER TABLE synthesis_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON synthesis_articles;
DROP POLICY IF EXISTS "fm_insert" ON synthesis_articles;
DROP POLICY IF EXISTS "fm_update" ON synthesis_articles;
DROP POLICY IF EXISTS "fm_delete" ON synthesis_articles;

CREATE POLICY "fm_select" ON synthesis_articles FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON synthesis_articles FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON synthesis_articles FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON synthesis_articles FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- wiki_pages
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON wiki_pages;
DROP POLICY IF EXISTS "fm_insert" ON wiki_pages;
DROP POLICY IF EXISTS "fm_update" ON wiki_pages;
DROP POLICY IF EXISTS "fm_delete" ON wiki_pages;

CREATE POLICY "fm_select" ON wiki_pages FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON wiki_pages FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON wiki_pages FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON wiki_pages FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- search_logs
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fm_select" ON search_logs;
DROP POLICY IF EXISTS "fm_insert" ON search_logs;
DROP POLICY IF EXISTS "fm_update" ON search_logs;
DROP POLICY IF EXISTS "fm_delete" ON search_logs;

CREATE POLICY "fm_select" ON search_logs FOR SELECT
  USING (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_insert" ON search_logs FOR INSERT
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_update" ON search_logs FOR UPDATE
  USING (family_id IN (SELECT user_family_ids()))
  WITH CHECK (family_id IN (SELECT user_family_ids()));
CREATE POLICY "fm_delete" ON search_logs FOR DELETE
  USING (family_id IN (SELECT user_family_ids()));

-- =========================================================
-- STEP 7: Storage bucket RLS (audio)
-- 파일 경로 규칙: {family_id}/{record_id}.m4a
-- =========================================================

-- Supabase 콘솔 Storage 탭에서 'audio' bucket RLS 활성화 후 아래 정책 추가:
/*
CREATE POLICY "audio_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT user_family_ids())
  );

CREATE POLICY "audio_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT user_family_ids())
  );

CREATE POLICY "audio_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT user_family_ids())
  );
*/

-- =========================================================
-- STEP 8: Supabase Auth — Apple Sign-In 활성화
-- =========================================================
-- Supabase 콘솔 → Authentication → Providers → Apple → 활성화
-- Apple Developer 콘솔에서:
--   1. App ID에 Sign In with Apple 서비스 추가
--   2. Services ID 생성 (com.aiseossi.vibediary.signin)
--   3. Private Key 생성 (.p8 파일)
-- 위 정보를 Supabase Apple provider 설정에 입력

-- =========================================================
-- 검증 쿼리
-- =========================================================
-- SELECT table_name, column_name FROM information_schema.columns
--   WHERE column_name IN ('family_id', 'created_by', 'updated_by', 'deleted_at')
--   AND table_schema = 'public'
--   ORDER BY table_name, column_name;

-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
