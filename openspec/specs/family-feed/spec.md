## Purpose

가족방 멤버 전체의 기록을 Supabase에서 직접 조회하여 공유 피드로 표시한다.

---

## Requirements

### Requirement: 가족 피드 화면
가족방 멤버 전체의 최신 records를 Supabase에서 직접 조회하여 표시하는 FamilyFeedScreen이 있어야 한다(SHALL). 로컬 SQLite에 다운싱크하지 않고 Supabase를 직접 쿼리한다(SHALL). 최신 50건을 기본 조회하며 수동 새로고침을 지원해야 한다(SHALL).

#### Scenario: 가족 피드 진입
- **WHEN** 사용자가 가족 피드 화면으로 이동할 때
- **THEN** 같은 family_id를 가진 모든 멤버의 records를 Supabase에서 최신순으로 최대 50건 조회하여 표시한다

#### Scenario: 수동 새로고침
- **WHEN** 사용자가 화면을 아래로 당겨 새로고침할 때
- **THEN** Supabase를 재쿼리하여 최신 기록으로 갱신한다

#### Scenario: 가족방 미가입 상태
- **WHEN** 사용자가 가족방에 참여하지 않은 상태에서 가족 피드에 진입할 때
- **THEN** "가족방에 참여하면 함께 기록을 볼 수 있어요" 안내 메시지와 설정 이동 버튼을 표시한다

#### Scenario: 가족 멤버 기록 없음
- **WHEN** 가족방에 참여했지만 다른 멤버가 아직 기록을 올리지 않았을 때
- **THEN** "아직 가족 기록이 없어요" 빈 상태 메시지를 표시한다

### Requirement: RLS 정책 — 가족방 멤버 기록 조회
같은 family_id를 가진 멤버는 서로의 records를 SELECT할 수 있어야 한다(SHALL). is_family_member RLS 함수를 활용하여 family_members 테이블 기반으로 접근을 제어한다(SHALL).

#### Scenario: 가족 멤버 기록 조회 허용
- **WHEN** 인증된 사용자가 같은 family_id를 가진 다른 멤버의 records를 조회할 때
- **THEN** RLS를 통과하여 해당 records가 반환된다

#### Scenario: 가족 외부인 기록 조회 차단
- **WHEN** 같은 가족방이 아닌 사용자가 records를 조회하려 할 때
- **THEN** RLS에 의해 빈 결과가 반환되거나 거부된다

### Requirement: 가족 피드 기록 카드 표시
가족 피드의 각 기록은 작성자 정보(표시 이름 또는 이메일 앞부분), 작성 시각, 요약 텍스트, 태그, 사진(있을 경우)을 포함해야 한다(SHALL).

#### Scenario: 기록 카드 렌더링
- **WHEN** 가족 피드에 기록 목록이 표시될 때
- **THEN** 각 카드에 작성자, 시각, 요약, 태그가 표시되며 photo_url이 있으면 썸네일도 함께 표시된다
