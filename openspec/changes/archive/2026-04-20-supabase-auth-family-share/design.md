## Context

바다 앱은 현재 100% 로컬 SQLite 기반이다. 기기 분실 시 데이터 유실, 가족 간 공유 불가라는 두 가지 한계가 있다. Supabase `badamulti` 프로젝트가 이미 생성되어 있고 `.env`에 URL/ANON_KEY가 존재하지만 패키지 미설치 상태다.

이번 1단계는 데이터를 Supabase로 이전하지 않고, **Auth + 가족방 구조**만 먼저 구축한다. 기존 유저는 변화를 느끼지 못하고, 원하는 사람만 설정에서 가족 공유를 활성화한다.

## Goals / Non-Goals

**Goals:**
- 앱 시작 시 회원가입/로그인 없이 자동으로 Supabase 익명 계정 발급
- 6자리 초대코드로 가족방 생성 및 참여
- 멤버 수 제한 없는 가족방 (조부모, 치료사 등 포함 가능)
- 세션 영속 저장 (앱 재시작 시 재로그인 불필요)
- 기존 로컬 SQLite 데이터 영향 없음

**Non-Goals:**
- 로컬 DB → Supabase DB 이전 (2단계)
- 사진/파일 업로드 (3단계)
- 권한 등급 구분 (읽기 전용 vs 쓰기 — 추후)
- 푸시 알림
- 계정 탈퇴/데이터 삭제

## Decisions

### D1. 익명 인증 우선, OAuth는 나중에 연결 가능하게
Supabase Anonymous Auth를 사용한다. 앱 첫 실행 시 `supabase.auth.signInAnonymously()`로 UUID 기반 세션 자동 발급. 나중에 `linkIdentity()`로 구글/카카오 연결 가능하도록 설계.

대안: 처음부터 구글 OAuth → 기존 사용자에게 로그인 화면이 강제 노출되는 마찰이 생겨 탈락.

### D2. 세션 저장: expo-secure-store
`@supabase/supabase-js`의 `storage` 옵션에 `expo-secure-store`를 주입. AsyncStorage 대비 iOS Keychain / Android Keystore로 암호화 저장.

### D3. 가족방 구조: families + family_members 두 테이블
```
families
  id (uuid, PK)
  invite_code (text, UNIQUE, 6자리 대문자+숫자)
  created_by (uuid, FK → auth.users)
  created_at (timestamptz)

family_members
  id (uuid, PK)
  family_id (uuid, FK → families)
  user_id (uuid, FK → auth.users)
  joined_at (timestamptz)
  UNIQUE(family_id, user_id)
```

RLS: 본인이 속한 family_id만 읽기/쓰기 가능.

### D4. 초대코드 형식: 6자리 대문자+숫자 (예: A3K9PX)
충분한 충돌 회피 (36^6 = 약 21억 가지). 서버사이드에서 중복 체크 후 재생성.

### D5. AuthContext를 ChildProvider 바깥에 위치
`App.tsx`에서 `AuthProvider > ChildProvider > ThemeProvider` 순서로 감싼다. AuthContext는 Supabase 세션만 관리하고, 기존 ChildContext는 그대로 유지.

### D6. 가족 공유 UI는 SettingsScreen 내 별도 섹션
새 화면(FamilyShareScreen)으로 분리. SettingsScreen에서 탭 시 push navigation.

## Risks / Trade-offs

- **익명 계정 고아화**: 사용자가 앱 삭제 후 재설치하면 새 익명 계정이 발급되어 가족방 연결이 끊긴다. → 나중에 "기기 이전" 기능(코드 재입력)으로 완화 가능. 2단계 DB 이전 시 user_id 기반 동기화 설계에서 고려.
- **Supabase 익명 계정 만료**: Supabase 기본 정책으로 익명 계정은 30일 비활성 시 삭제될 수 있다. → 앱 실행 시마다 세션 갱신으로 완화.
- **초대코드 탈취**: 코드를 알면 누구나 가족방에 참여 가능. → 현재 단계에서는 허용. 추후 방장 승인 기능 고려.

## Migration Plan

1. Supabase 대시보드에서 `families`, `family_members` 테이블 생성 + RLS 설정
2. Supabase 대시보드에서 Anonymous Auth 활성화
3. 앱에 패키지 설치 + 코드 배포
4. 기존 사용자: 앱 업데이트 시 첫 실행에 자동 익명 계정 발급 (화면 변화 없음)
5. 롤백: Supabase 연결 실패 시 앱 기능에 영향 없음 (로컬 SQLite 그대로 동작)

## Open Questions

- Supabase 대시보드에서 Anonymous Auth가 현재 활성화되어 있는가? (확인 필요)
- `badamulti` 프로젝트에 기존 테이블이 있는가? (확인 후 충돌 여부 판단)
