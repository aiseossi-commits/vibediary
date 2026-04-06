## ADDED Requirements

### Requirement: synthesis_articles DB 테이블
시스템은 DB v9 마이그레이션으로 `synthesis_articles` 테이블과 `absorb_log` 테이블을 생성해야 한다.

#### Scenario: 마이그레이션 실행
- **WHEN** DB 버전이 8 이하인 상태에서 앱이 시작되면
- **THEN** synthesis_articles(id, child_id, type, title, body, source_record_ids, period_start, period_end, created_at, updated_at)와 absorb_log(id, child_id, absorbed_count, articles_created, articles_updated, ran_at) 테이블이 생성되어야 한다

#### Scenario: 기존 데이터 보존
- **WHEN** v9 마이그레이션이 실행되면
- **THEN** 기존 records, tags, record_tags 테이블 데이터는 변경 없이 유지되어야 한다

---

### Requirement: Absorb 트리거 조건 체크
시스템은 마지막 absorb 이후 신규 기록이 10개 이상 누적되면 "인사이트 생성 가능" 상태를 반환해야 한다.

#### Scenario: 임계값 도달
- **WHEN** 마지막 absorb_log 이후 해당 child의 신규 records 수가 10개 이상이면
- **THEN** `shouldAbsorb(childId)` 가 true를 반환해야 한다

#### Scenario: 임계값 미달
- **WHEN** 신규 기록이 10개 미만이면
- **THEN** `shouldAbsorb(childId)` 가 false를 반환해야 한다

#### Scenario: 첫 absorb (absorb_log 없음)
- **WHEN** 해당 child의 absorb_log가 없고 records가 10개 이상이면
- **THEN** `shouldAbsorb(childId)` 가 true를 반환해야 한다

---

### Requirement: weekly_overview 아티클 생성
Absorb 실행 시 최근 14일 기록을 요약한 `weekly_overview` 아티클을 생성 또는 갱신해야 한다.

#### Scenario: 주간 요약 생성
- **WHEN** `runAbsorb(childId)` 가 실행되고 최근 14일 records가 1개 이상 존재하면
- **THEN** type="weekly_overview"인 synthesis_article이 생성 또는 갱신되어야 한다

#### Scenario: 아티클 품질 보장
- **WHEN** AI가 weekly_overview 본문을 생성하면
- **THEN** 본문이 10줄 이상이어야 하며, 미달 시 저장하지 않아야 한다

---

### Requirement: developmental_domain 아티클 생성
Absorb 실행 시 도메인별 발달 관찰을 합성한 `developmental_domain` 아티클을 생성 또는 갱신해야 한다.

#### Scenario: 발달 도메인 아티클 생성
- **WHEN** `runAbsorb(childId)` 실행 시 event_type="developmental"인 records가 3개 이상이면
- **THEN** type="developmental_domain"인 synthesis_article이 생성 또는 갱신되어야 한다

#### Scenario: 기존 아티클 갱신
- **WHEN** 이미 developmental_domain 아티클이 존재하면
- **THEN** 기존 아티클 본문을 입력으로 포함하여 갱신하고 updated_at을 현재 시각으로 업데이트해야 한다

---

### Requirement: milestone_timeline 아티클 생성
Absorb 실행 시 `is_milestone=true`인 기록을 모아 이정표 타임라인 아티클을 생성 또는 갱신해야 한다.

#### Scenario: 이정표 타임라인 생성
- **WHEN** `runAbsorb(childId)` 실행 시 is_milestone=true인 records가 1개 이상이면
- **THEN** type="milestone_timeline"인 synthesis_article이 생성 또는 갱신되어야 한다

#### Scenario: 이정표 없음
- **WHEN** is_milestone=true인 records가 없으면
- **THEN** milestone_timeline 아티클을 생성하지 않아야 한다

---

### Requirement: Absorb 완료 기록
Absorb 실행 완료 시 absorb_log에 실행 기록을 저장해야 한다.

#### Scenario: 정상 완료
- **WHEN** `runAbsorb(childId)` 가 성공적으로 완료되면
- **THEN** absorbed_count, articles_created, articles_updated, ran_at이 absorb_log에 INSERT되어야 한다

#### Scenario: AI 실패 시 부분 저장
- **WHEN** absorb 중 AI 호출이 실패하면
- **THEN** 성공한 아티클만 저장하고, 실패한 타입은 건너뛰고, absorb_log에는 성공 수만 기록해야 한다
