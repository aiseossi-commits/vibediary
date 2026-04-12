## 1. DB 마이그레이션 (v9)

- [x] 1.1 schema.ts에 CREATE_SYNTHESIS_ARTICLES_TABLE, CREATE_ABSORB_LOG_TABLE SQL 상수 추가
- [x] 1.2 schema.ts의 DEFAULT_TAGS 아래에 synthesis_articles 인덱스(child_id+type, updated_at) 추가
- [x] 1.3 database.ts에 v9 마이그레이션 블록 추가 (synthesis_articles, absorb_log 테이블 생성)

## 2. 타입 정의

- [x] 2.1 types/record.ts의 StructuredData 인터페이스에 ontology_code?: string, is_milestone?: boolean 추가
- [x] 2.2 types/record.ts에 SynthesisArticle 타입 추가 (id, childId, type, title, body, sourceRecordIds, periodStart, periodEnd, createdAt, updatedAt)
- [x] 2.3 types/record.ts에 AbsorbResult 타입 추가 (absorbedCount, articlesCreated, articlesUpdated)

## 3. synthesisDao.ts 구현

- [x] 3.1 src/db/synthesisDao.ts 신규 생성
- [x] 3.2 getSynthesisArticles(childId): SynthesisArticle[] — child 기준 전체 조회 (최신순)
- [x] 3.3 upsertSynthesisArticle(article): 동일 child_id + type이면 UPDATE, 없으면 INSERT
- [x] 3.4 deleteSynthesisArticle(id): 단건 삭제
- [x] 3.5 getLastAbsorbTime(childId): absorb_log 최근 ran_at 반환
- [x] 3.6 insertAbsorbLog(childId, result): absorb 완료 기록 저장

## 4. Ingest AI 프롬프트 개선

- [x] 4.1 aiProcessor.ts buildSystemPrompt에 developmental 처리 시 ontology_code 추출 지침 추가 (8개 코드 목록 포함)
- [x] 4.2 aiProcessor.ts buildSystemPrompt에 is_milestone 감지 지침 추가 ("처음", "첫", "드디어" 등 키워드 기반)
- [x] 4.3 aiProcessor.ts parseAIResponse에서 is_milestone 필드 허용하도록 유효성 검사 업데이트
- [x] 4.4 npx tsc --noEmit 통과 확인

## 5. absorbService.ts 구현

- [x] 5.1 src/services/absorbService.ts 신규 생성
- [x] 5.2 shouldAbsorb(childId): 마지막 absorb 이후 신규 records 10개 이상 여부 체크
- [x] 5.3 buildWeeklyOverviewPrompt(records): 최근 14일 records → AI 프롬프트 생성
- [x] 5.4 buildDevelopmentalDomainPrompt(records, existingBody?): developmental records → AI 프롬프트
- [x] 5.5 buildMilestoneTimelinePrompt(records, existingBody?): is_milestone=true records → AI 프롬프트
- [x] 5.6 runAbsorb(childId): 세 타입 순차 처리, 각 결과 upsertSynthesisArticle, 완료 후 insertAbsorbLog
- [x] 5.7 AI 실패 시 해당 타입만 건너뛰고 계속 진행하도록 try/catch 처리
- [x] 5.8 아티클 본문 10줄 미만이면 저장 건너뛰는 품질 체크 추가

## 6. searchPipeline.ts 개선

- [x] 6.1 getSynthesisArticles import 추가
- [x] 6.2 formatSynthesisArticle(article): synthesis 아티클을 컨텍스트 텍스트로 포맷하는 함수 추가
- [x] 6.3 searchRecords에서 synthesis_articles 로드 → synthesis context 생성
- [x] 6.4 synthesis 없을 때 기존 raw records 전체 방식으로 fallback
- [x] 6.5 synthesis 있을 때 최근 30개 raw records + synthesis context를 시스템 프롬프트 개선해서 전달
- [x] 6.6 SEARCH_SYSTEM_PROMPT에 <synthesis> 섹션 참조 지침 추가

## 7. SearchScreen UI 리뉴얼

- [x] 7.1 SearchScreen 상단에 "등대" / "항해일지" 세그먼트 컨트롤 추가 (activeTab state)
- [x] 7.2 activeTab === 'chat'이면 기존 채팅 UI 표시, 'log'이면 항해일지 피드 표시
- [x] 7.3 VoyageLogFeed 컴포넌트 구현: getSynthesisArticles + getSearchLogs 로드, 인사이트 카드 + 저장된 질문 섹션 렌더링
- [x] 7.4 인사이트 카드 UI: type 한국어 레이블(주간 요약/발달 성장/이정표), title, body 4줄 truncate, updated_at
- [x] 7.5 shouldAbsorb 체크 → true이면 "인사이트 생성 가능" 배너 표시 (항해일지 탭에만)
- [x] 7.6 배너 탭 → runAbsorb 실행 → 로딩 → 완료 시 피드 갱신
- [x] 7.7 인사이트 카드 삭제: 확인 다이얼로그 → deleteSynthesisArticle → 피드 갱신
- [x] 7.8 activeChild 변경 시 피드 데이터 초기화 및 재로드 (useFocusEffect 또는 useEffect)
- [x] 7.9 빈 항해일지 상태: synthesis 없고 search_logs 없을 때 안내 메시지 표시
- [x] 7.10 저장된 질문 섹션: 기존 항해일지 카드 UI 유지, 섹션 헤더 "저장된 질문" 추가

## 8. 검증

- [x] 8.1 npx tsc --noEmit 통과
- [ ] 8.2 absorb 실행 후 synthesis_articles 생성 확인 (기록 10개 이상 필요)
- [ ] 8.3 AI 등대 질문 시 synthesis 컨텍스트 포함 여부 콘솔 확인
- [ ] 8.4 항해일지 탭 전환 동작 확인
- [ ] 8.5 activeChild 전환 시 피드 갱신 확인
- [ ] 8.6 인사이트 카드 삭제 동작 확인
- [x] 8.7 STATE.md 업데이트
