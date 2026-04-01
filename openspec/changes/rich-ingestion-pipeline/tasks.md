## 1. 타입 확장

- [x] 1.1 `src/types/record.ts` StructuredData 인터페이스에 선택적 필드 추가: `event_type`, `antecedent`, `behavior`, `consequence`, `domain`

## 2. aiProcessor.ts 프롬프트 강화

- [x] 2.1 `buildSystemPrompt`에 기록 유형 분류 지시 추가 (behavioral_incident / medical / developmental / daily)
- [x] 2.2 행동 사건 시 A/B/C 추출 지시 추가
- [x] 2.3 발달 관찰 시 domain 추출 지시 추가
- [x] 2.4 JSON 응답 스키마 예시 업데이트 (structured_data에 신규 필드 포함)
- [x] 2.5 maxOutputTokens 256 → 700으로 변경

## 3. searchPipeline.ts formatRecord 개선

- [x] 3.1 `formatRecord`에서 event_type === 'behavioral_incident'이면 `[A:..., B:..., C:...]` 포맷으로 출력
- [x] 3.2 event_type === 'developmental'이면 `[domain:..., type:발달관찰]` 포맷으로 출력
- [x] 3.3 event_type 없으면 기존 key:value 방식 유지

## 4. 검증

- [x] 4.1 `npx tsc --noEmit` 타입 오류 없음 확인
- [x] 4.2 parseAIResponse에서 신규 필드 파싱 방어 로직 확인 (없으면 보강)
