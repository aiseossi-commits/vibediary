## ADDED Requirements

### Requirement: 전체 데이터 JSON 내보내기
시스템은 children, records, tags, record_tags 테이블의 모든 데이터를 JSON 파일로 직렬화하여 내보내기 SHALL 한다. 파일명은 `vibediary-backup-YYYYMMDD.json` 형식이어야 하며 `version`, `exportedAt` 필드를 포함해야 한다. `embedding` BLOB과 오디오 바이너리는 백업에서 제외한다.

#### Scenario: 내보내기 성공
- **WHEN** 사용자가 설정 화면에서 "백업 내보내기" 버튼을 탭한다
- **THEN** 시스템은 전체 DB를 JSON으로 직렬화하고 시스템 공유 시트(Files 앱, AirDrop 등)를 표시한다

#### Scenario: 내보내기 파일명 형식
- **WHEN** 백업 파일이 생성된다
- **THEN** 파일명은 `vibediary-backup-YYYYMMDD.json` 형식이며 내보내기 당일 날짜를 포함한다

#### Scenario: 빈 데이터 내보내기
- **WHEN** 기록이 하나도 없는 상태에서 내보내기를 실행한다
- **THEN** 시스템은 빈 배열을 포함한 유효한 JSON 파일을 생성하고 공유 시트를 표시한다

### Requirement: 백업 파일 포맷 버전 관리
백업 JSON 파일은 `version` 필드를 SHALL 포함하여 향후 스키마 변경 시 마이그레이션이 가능해야 한다. 현재 버전은 `1`이다.

#### Scenario: 버전 필드 포함
- **WHEN** 백업 파일이 생성된다
- **THEN** JSON 최상위에 `"version": 1` 과 `"exportedAt"` (Unix timestamp) 필드가 존재한다
