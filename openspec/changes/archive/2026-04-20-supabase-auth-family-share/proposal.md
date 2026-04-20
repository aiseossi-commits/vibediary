## Why

현재 바다 앱은 기기 로컬 SQLite에만 데이터를 저장하므로 기기 분실 시 데이터가 사라지고, 가족 간 돌봄 기록 공유가 불가능하다. 서버화 1단계로 Supabase 익명 인증 + 초대코드 기반 가족방을 구현해 회원가입 없이 클라우드 백업과 가족 공유를 지원한다.

## What Changes

- 앱 최초 실행 시 Supabase 익명 인증으로 자동 계정 생성 (로그인 화면 없음)
- 가족방 생성: 6자리 초대코드 자동 발급
- 가족방 참여: 코드 입력으로 같은 방에 합류 (멤버 수 제한 없음)
- 설정 화면에 "가족 공유" 섹션 추가 (코드 생성/공유/참여 UI)
- `@supabase/supabase-js` + `expo-secure-store` 패키지 추가
- 기존 로컬 SQLite 데이터는 그대로 유지 (DB 이전은 2단계)

## Capabilities

### New Capabilities
- `supabase-anon-auth`: 앱 시작 시 자동 익명 인증, 세션 영속 저장, AuthContext 전역 관리
- `family-room`: 초대코드 기반 가족방 생성/참여, Supabase families 테이블, 멤버 관리

### Modified Capabilities
<!-- 없음 — 기존 spec 요구사항 변경 없음 -->

## Impact

- **새 패키지**: `@supabase/supabase-js`, `expo-secure-store`
- **새 파일**: `src/lib/supabase.ts`, `src/context/AuthContext.tsx`, `src/screens/FamilyShareScreen.tsx`
- **수정 파일**: `src/navigation/AppNavigator.tsx` (AuthContext 주입), `src/screens/SettingsScreen.tsx` (가족 공유 섹션 추가)
- **Supabase 대시보드**: `families`, `family_members` 테이블 생성, RLS 정책 설정
- **환경변수**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (이미 .env에 존재)
