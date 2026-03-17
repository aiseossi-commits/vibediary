## Context

현재 AI 등대 검색 파이프라인:
1. `generateEmbedding(query)` → 쿼리 임베딩 생성
2. `vectorSearch(topK=5)` → 유사도 상위 5건
3. `generateAnswer()` → Gemini 호출 (maxOutputTokens=300)

두 가지 버그/한계:
- **임베딩 누락**: `offlineQueue.ts`에서 AI 처리 완료 후 `generateEmbedding()` 미호출 → 해당 기록은 `embedding IS NOT NULL` 조건에서 영구 제외
- **검색 범위 부족**: topK=5 고정으로 관련 기록이 여러 건이어도 일부만 LLM에 전달 → 패턴 분석 불가, LLM 답변이 일부 기록만 언급

## Goals / Non-Goals

**Goals:**
- offlineQueue 처리 완료 기록에 embedding 생성 추가
- vectorSearch를 유사도 threshold 기반으로 변경 (최대 50건)
- LLM 프롬프트를 패턴/빈도 분석형으로 개선
- 분석 건수를 사용자에게 명시

**Non-Goals:**
- JS 집계 레이어 추가 (structuredData 키가 비정형이라 효과 없음)
- 기존 저장 기록의 embedding 일괄 재생성 (별도 마이그레이션 작업)
- 웹 서비스 연동 (향후 별도 change)
- 히스토리 UI (향후 별도 change)

## Decisions

### 1. topK → threshold + cap 방식

**결정**: 유사도 0.3 이상인 기록 전체, 최대 50건 cap

**이유**: 고정 topK=5는 관련 기록이 많을 때 패턴 왜곡. threshold로 관련 없는 기록을 자동 제외하면서도, cap으로 토큰/응답속도 보호.

**대안 고려**: topK=20 고정 → 관련 없는 기록도 강제 포함될 수 있어 기각.

**임계값 0.3 근거**: text-embedding-004 기준 0.3 이하는 주제가 다른 기록. 실제 돌봄 기록에서 같은 주제 기록은 보통 0.4~0.8 범위.

### 2. JS 집계 레이어 미도입

**결정**: LLM이 summary 텍스트를 직접 읽고 패턴 파악

**이유**: `structured_data`는 체온/약물명/용량 등 수치형 데이터만 저장. 음식·증상 같은 패턴 정보는 `summary` 자유 텍스트에 있어 JS 집계 불가. LLM이 자연어에서 패턴을 추출하는 게 더 정확.

**토큰 비용**: 50건 × summary 100자 ≈ 2,000토큰. Gemini 2.5 Flash Lite 기준 무시할 수준.

### 3. maxOutputTokens 300 → 600

**결정**: 600으로 증가

**이유**: 여러 기록의 패턴을 서술하기에 300토큰은 부족. 600은 5~10건 패턴 서술에 충분하면서 비용 증가 최소.

### 4. 분석 건수 표시

**결정**: LLM 프롬프트에 총 분석 건수 주입, 답변 첫 줄에 반영 유도

**이유**: "N건 분석했어요"를 명시하면 top-50 한계가 버그가 아닌 설계된 동작으로 인식됨. 향후 웹 서비스 안내 연결 가능.

### 5. context 포맷 compact화

**결정**: 연도 제거, 구분자 최소화

```
기존: [2026-03-01] #의료 #투약 타이레놀 5ml 먹임 (약물명: 타이레놀, 용량: 5ml)
변경: 03-01 #의료#투약 타이레놀 5ml 먹임 [약물명:타이레놀,용량:5ml]
```

레코드당 약 15% 토큰 절약.

## Risks / Trade-offs

- **threshold 0.3이 너무 낮을 경우** → 관련 없는 기록 포함 → LLM 답변 품질 저하
  → Mitigation: 실사용 후 0.35~0.4로 조정 가능하도록 상수로 추출

- **50건 cap에서 패턴 누락** → 3년치 기록에서 관련 기록이 50건 초과 시 일부 미포함
  → Mitigation: 분석 건수 표시로 사용자 인지, 웹 서비스에서 전수 분석 제공 예정

- **offlineQueue embedding 생성 실패** → 네트워크 오류 시 embedding 없이 저장
  → Mitigation: 실패 시 null로 저장 (기존 동작 유지), silent fail로 큐 처리 중단 방지
