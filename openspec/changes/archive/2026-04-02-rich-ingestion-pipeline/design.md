## Context

현재 `aiProcessor.ts`는 단일 Gemini 호출로 요약+태그+의료수치를 추출한다 (maxOutputTokens: 256). `StructuredData`는 `[key: string]: string | number` 자유형 인터페이스다. `searchPipeline.ts`의 `formatRecord`는 structured_data를 `key:value` 나열로만 표시하여 행동 구조(A/B/C)가 검색 컨텍스트에 표현되지 않는다.

## Goals / Non-Goals

**Goals:**
- Gemini가 ingestion 시점에 기록 유형을 분류하고 유형별 구조 추출
- structured_data에 행동 사건 ABC, 발달 관찰 영역 저장
- formatRecord가 새 필드를 검색 컨텍스트에 명시적으로 포함
- 기존 기록 호환성 유지 (신규 필드 없으면 그냥 무시)

**Non-Goals:**
- 기존 기록 일괄 재처리 (옵션으로만 제공)
- DB 스키마 변경 (structured_data는 TEXT 컬럼 그대로)
- UI 변경

## Decisions

### D1. 단일 호출 유지 (2-pass 아님)
기록 하나당 Gemini 호출을 2번으로 늘리지 않는다. 프롬프트를 강화하여 1회 호출로 유형 분류 + 구조 추출을 동시에 수행. 토큰 비용 최소화.

### D2. structured_data 확장 스키마
```typescript
interface StructuredData {
  // 기존 (의료)
  temperature?: number;
  medication?: string;
  sleep_hours?: number;

  // 신규
  event_type?: 'behavioral_incident' | 'medical' | 'developmental' | 'daily';
  antecedent?: string;   // A: 선행 사건 (event_type=behavioral_incident 시)
  behavior?: string;     // B: 아이 행동
  consequence?: string;  // C: 결과/반응
  domain?: string;       // 발달 영역 (event_type=developmental 시, 예: "언어", "사회성")
}
```

### D3. maxOutputTokens 256 → 700
구조화 필드 추가로 출력이 늘어난다. 토큰 비용 분석: 유저 1,000명 × 3건/일 × 3년 기준 추가 비용 ~$246 (유저당 연 $0.08). 수용.

### D4. formatRecord 개선
```
기존: "2026-03-15 #행동 드러누워 울었음 [temperature:37.5]"
신규: "2026-03-15 #행동 드러누워 울었음 [A:마트 과자 거부, B:드러누워 울기, C:과자 구매]"
```
event_type이 있으면 해당 구조를 명시적으로 표시. 없으면 기존 방식 유지.

## Risks / Trade-offs

- **[위험] LLM 추출 품질**: 짧은 기록에서 ABC가 불명확하면 빈 필드로 반환됨 → 검색 컨텍스트에서 생략, 안전
- **[트레이드오프] 기존 기록**: 신규 스키마 미적용. offlineQueue 재처리 기능은 이미 있으므로 향후 선택적 재처리 가능
- **[위험] 프롬프트 복잡도 증가**: JSON 구조가 커질수록 Gemini Flash Lite가 잘못 파싱할 가능성 → parseAIResponse에 방어 로직 보강
