## 1. Supabase 대시보드 설정

- [x] 1.1 `badamulti` 프로젝트 > Authentication > Providers > Anonymous 활성화
- [x] 1.2 SQL Editor에서 `families` 테이블 생성 (id, invite_code UNIQUE, created_by, created_at)
- [x] 1.3 SQL Editor에서 `family_members` 테이블 생성 (id, family_id, user_id, joined_at, UNIQUE(family_id, user_id))
- [x] 1.4 `families` RLS 정책 설정: 본인이 속한 family_id만 SELECT/INSERT 허용
- [x] 1.5 `family_members` RLS 정책 설정: 본인 user_id 또는 같은 family의 멤버만 SELECT, INSERT는 본인만

## 2. 패키지 설치 및 Supabase 클라이언트 초기화

- [x] 2.1 `npx expo install @supabase/supabase-js expo-secure-store` 설치
- [x] 2.2 `src/lib/supabase.ts` 생성 — createClient에 expo-secure-store 기반 storage 주입, URL/KEY는 EXPO_PUBLIC_ 환경변수 사용

## 3. AuthContext 구현

- [x] 3.1 `src/context/AuthContext.tsx` 생성 — signInAnonymously 자동 호출, session/userId/isLoading 제공
- [x] 3.2 세션 복원 로직: 앱 시작 시 기존 세션 확인 후 재사용, 없으면 signInAnonymously
- [x] 3.3 Supabase 연결 실패(오프라인) 시 에러 무시 처리 — 기존 기능 영향 없음
- [x] 3.4 `App.tsx`에 AuthProvider 추가 — ChildProvider 바깥에 위치

## 4. 가족방 서비스 구현

- [x] 4.1 `src/services/familyService.ts` 생성
- [x] 4.2 `createFamilyRoom()` — 6자리 랜덤 코드 생성, families INSERT, family_members INSERT, 중복 시 재시도
- [x] 4.3 `joinFamilyRoom(code)` — invite_code로 families 조회, family_members INSERT, 오류 처리 (코드 없음, 이미 참여 중)
- [x] 4.4 `getMyFamilyRoom()` — 현재 사용자가 속한 가족방 정보 조회 (코드, 멤버 수)
- [x] 4.5 `leaveFamilyRoom()` — family_members에서 본인 레코드 삭제

## 5. 가족 공유 화면 구현

- [x] 5.1 `src/screens/FamilyShareScreen.tsx` 생성
- [x] 5.2 미참여 상태 UI: "가족방 만들기" 버튼 + "초대코드로 참여" 입력 필드
- [x] 5.3 참여 상태 UI: 초대코드 표시 + 복사 버튼 + 멤버 수 + "가족방 나가기" 버튼
- [x] 5.4 로딩/에러 상태 처리

## 6. 설정 화면 연결

- [x] 6.1 `src/screens/SettingsScreen.tsx`에 "가족 공유" 섹션 추가
- [x] 6.2 탭 시 FamilyShareScreen으로 push navigation

## 7. 네비게이터 업데이트

- [x] 7.1 `src/navigation/AppNavigator.tsx`에 FamilyShareScreen Stack.Screen 추가
- [x] 7.2 타입 체크: `npx tsc --noEmit` 통과 확인
