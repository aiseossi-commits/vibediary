## ADDED Requirements

### Requirement: 앱 스토어 메타데이터 확정
스토어 제출 전 앱 이름, 설명문, 키워드, 카테고리가 문서로 확정되어야 한다.

#### Scenario: 메타데이터 문서 존재
- **WHEN** 스토어 제출 준비를 시작할 때
- **THEN** 앱 이름, 짧은 설명(80자), 긴 설명, 키워드, 카테고리가 명시된 문서가 존재해야 한다

### Requirement: Android AAB 빌드
Play Store 제출용 AAB(Android App Bundle) 파일이 생성되어야 한다.

#### Scenario: AAB 빌드 성공
- **WHEN** `./gradlew bundleRelease` 를 실행할 때
- **THEN** 서명된 AAB 파일이 `android/app/build/outputs/bundle/release/` 에 생성되어야 한다

#### Scenario: 서명 키 존재
- **WHEN** AAB 빌드를 실행할 때
- **THEN** 키스토어 파일과 비밀번호가 준비되어 있어야 한다
