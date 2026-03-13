## ADDED Requirements

### Requirement: 백업 파일 선택 및 유효성 검증
시스템은 사용자가 JSON 백업 파일을 선택할 수 있도록 파일 피커를 SHALL 제공해야 하며, 선택된 파일이 유효한 VibeDiary 백업인지 검증해야 한다.

#### Scenario: 유효한 백업 파일 선택
- **WHEN** 사용자가 "백업 가져오기" 버튼을 탭하고 유효한 JSON 파일을 선택한다
- **THEN** 시스템은 파일을 파싱하고 덮어쓰기/병합 선택 다이얼로그를 표시한다

#### Scenario: 잘못된 파일 선택
- **WHEN** 사용자가 VibeDiary 백업 형식이 아닌 파일을 선택한다
- **THEN** 시스템은 "유효하지 않은 백업 파일입니다" 오류 메시지를 표시하고 복원을 진행하지 않는다

### Requirement: 덮어쓰기 복원
시스템은 기존 DB 전체를 삭제하고 백업 데이터로 교체하는 덮어쓰기 모드를 SHALL 지원해야 한다. 복원 전 사용자 확인을 받아야 한다.

#### Scenario: 덮어쓰기 복원 성공
- **WHEN** 사용자가 덮어쓰기 모드를 선택하고 확인 다이얼로그에서 확인한다
- **THEN** 시스템은 기존 데이터를 모두 삭제하고 백업 파일의 모든 데이터를 삽입한 후 "복원 완료" 메시지를 표시한다

#### Scenario: 덮어쓰기 복원 확인 다이얼로그
- **WHEN** 사용자가 덮어쓰기 모드를 선택한다
- **THEN** 시스템은 "기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?" 확인 다이얼로그를 표시한다

### Requirement: 병합 복원
시스템은 기존 데이터를 유지하면서 백업의 신규 데이터만 추가하는 병합 모드를 SHALL 지원해야 한다. 중복 id는 건너뛰고, child id 충돌 시 새 UUID를 생성한다.

#### Scenario: 병합 복원 - 신규 기록 추가
- **WHEN** 사용자가 병합 모드를 선택하고 확인한다
- **THEN** 시스템은 백업 파일에서 현재 DB에 없는 records만 삽입하고 기존 records는 유지한다

#### Scenario: 병합 복원 - child id 충돌 처리
- **WHEN** 백업 파일의 child.id가 현재 DB의 child.id와 충돌한다
- **THEN** 시스템은 해당 child에 새 UUID를 부여하고 연관된 records의 child_id를 새 UUID로 업데이트한다

#### Scenario: 병합 복원 - 태그 중복 처리
- **WHEN** 백업 파일의 tag.name이 현재 DB에 이미 존재한다
- **THEN** 시스템은 기존 태그를 재사용하고 INSERT를 건너뛴다

### Requirement: 복원 후 AI 재처리 대기 상태 설정
복원된 records의 embedding은 NULL이므로 시스템은 해당 records의 `ai_pending`을 1로 SHALL 설정해야 한다.

#### Scenario: 복원 후 ai_pending 설정
- **WHEN** 복원(덮어쓰기 또는 병합)이 완료된다
- **THEN** 복원된 모든 records의 `embedding`은 NULL이고 `ai_pending`은 1로 설정된다
