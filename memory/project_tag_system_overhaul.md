---
name: tag-system-overhaul 구현 및 버그 수정
description: 태그 아이별 격리, 중복 태그 버그 원인 및 수정 내역
type: project
---

## 구현 완료 (2026-03-29)

태그 시스템 전면 개편. DB v3~v5 마이그레이션 포함.

**Why:** 커스텀 태그가 전역 공유되고, 기본 태그 삭제 가능하고, 기록 상세에서 태그 수동 편집이 불가능했음.

**How to apply:** 태그 관련 추가 수정 시 아래 구조 숙지 필요.

## 핵심 구조

- `tags` 테이블: `child_id IS NULL` = global(기본 태그), `child_id = UUID` = 아이별 커스텀
- `UNIQUE(name, child_id)` + partial unique index `idx_tags_name_global` (WHERE child_id IS NULL)
- `DEFAULT_TAGS` 단일 출처 (`schema.ts`) — 하드코딩 3중 중복 제거

## SQLite NULL UNIQUE 버그 (중요)

`UNIQUE(name, child_id)`는 SQLite에서 NULL끼리 distinct 취급 → `('#일상', NULL)` 중복 삽입 허용됨.
**해결:** `CREATE UNIQUE INDEX ... WHERE child_id IS NULL` partial index 추가 (v5 마이그레이션).

기존 DB에서 기본 태그가 12~14개씩 중복 생성되어 있었음. v5 마이그레이션으로 정리.

## 마이그레이션 이력

| 버전 | 내용 |
|------|------|
| v3 | tags 테이블 재생성, child_id 추가 |
| v4 | child_id IS NOT NULL 기본 태그 중복 정리 |
| v5 | NULL 중복 정리 + partial unique index |

## 주의사항

- `createTag(name, childId)`: 기본 태그명이면 항상 `childId=NULL` 강제 (중복 방지)
- 마이그레이션은 기본 태그 삽입보다 **반드시 먼저** 실행 (child_id 컬럼 없는 구버전 DB 대응)
- DB 변경 시 JS 리로드(Cmd+R)로 마이그레이션 실행 가능 (네이티브 재빌드 불필요)
