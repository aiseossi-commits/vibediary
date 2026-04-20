## ADDED Requirements

### Requirement: 앱 시작 시 자동 익명 인증
앱이 처음 실행될 때 시스템은 사용자 개입 없이 Supabase 익명 계정을 자동으로 생성하고 세션을 발급해야 한다(SHALL). 기존 세션이 있으면 재사용해야 한다(SHALL).

#### Scenario: 최초 실행 시 자동 계정 생성
- **WHEN** 앱을 처음 실행하고 저장된 Supabase 세션이 없을 때
- **THEN** `signInAnonymously()`를 호출하여 익명 계정을 생성하고 세션을 expo-secure-store에 저장한다

#### Scenario: 재실행 시 기존 세션 복원
- **WHEN** 앱을 재실행하고 expo-secure-store에 유효한 세션이 있을 때
- **THEN** 기존 세션을 복원하여 새 계정 생성 없이 인증 상태를 유지한다

#### Scenario: 세션 만료 시 자동 갱신
- **WHEN** 저장된 세션의 액세스 토큰이 만료되었을 때
- **THEN** 리프레시 토큰으로 자동 갱신하고, 갱신 실패 시 새 익명 계정을 발급한다

### Requirement: AuthContext를 통한 전역 인증 상태 관리
시스템은 AuthContext를 통해 앱 전체에서 현재 Supabase 세션과 사용자 ID에 접근할 수 있어야 한다(SHALL). AuthContext는 App.tsx 최상위에서 ChildProvider를 감싸야 한다(SHALL).

#### Scenario: 컴포넌트에서 인증 상태 접근
- **WHEN** 어떤 컴포넌트에서 `useAuth()` 훅을 호출할 때
- **THEN** 현재 세션(session), 사용자 ID(userId), 로딩 상태(isLoading)를 반환한다

#### Scenario: 인증 로딩 중 앱 렌더링 차단 없음
- **WHEN** 앱 시작 시 Supabase 세션 초기화 중일 때
- **THEN** 기존 앱 UI(로딩 스피너, 메인 화면)는 정상적으로 렌더링되고, 인증 상태는 백그라운드에서 초기화된다

### Requirement: Supabase 연결 실패 시 앱 정상 동작
Supabase 연결이 실패하거나 네트워크가 없을 때도 앱의 기존 기능(녹음, 기록 조회, AI 처리)은 정상 동작해야 한다(SHALL).

#### Scenario: 오프라인 상태에서 앱 실행
- **WHEN** 네트워크 없이 앱을 실행할 때
- **THEN** Supabase 초기화 실패를 무시하고 기존 로컬 SQLite 기반 기능이 정상 동작한다
