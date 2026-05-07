# 온톨로지 정합성 검사

`src/services/aiProcessor.ts`, `src/services/recordPipeline.ts`, `src/db/schema.ts`와 `~/Documents/Obsidian Vault/바다 세계관/온톨로지.md`를 읽고, 아래 항목이 일치하는지 검사한다.

## SSOT 정책

- **온톨로지.md** = 진실 (canonical)
- **schema.ts의 DEFAULT_TAGS** = 코드 기준 SSOT (온톨로지를 반영)
- **aiProcessor.ts의 프롬프트 허용 태그 리스트** = DEFAULT_TAGS에서 동적 생성됨 (직접 수정 금지)
- **recordPipeline.ts의 PARENT_TAG_MAP** = 하위→부모 매핑 (온톨로지 계층 반영)

## 검사 항목

1. **발달 영역 코드** — 온톨로지.md의 영역 코드(예: COM, MOT, SOC 등)가 aiProcessor.ts 프롬프트에 올바르게 반영되어 있는가?
2. **structured_data 스키마** — 온톨로지.md의 필드 정의(event_type, domain, ontology_code, is_milestone, antecedent, behavior, consequence 등)가 aiProcessor.ts 프롬프트 및 파싱 로직과 일치하는가?
3. **태그 목록 (DEFAULT_TAGS)** — 온톨로지.md의 태그 목록이 `src/db/schema.ts`의 DEFAULT_TAGS와 일치하는가?
4. **태그 계층 (PARENT_TAG_MAP)** — 온톨로지.md의 상위/하위 태그 관계가 `src/services/recordPipeline.ts`의 PARENT_TAG_MAP에 빠짐없이 반영되어 있는가? (특히 #치료 8개 / #투약 4개 / #행동 4개 매핑)
5. **프롬프트 카테고리 본문** — aiProcessor.ts 프롬프트의 `[치료 계열]`, `[투약 계열]` 등 카테고리별 설명이 온톨로지.md의 정의와 일치하는가? (이 부분은 수동 유지이므로 회귀 위험 큼)
6. **누락/추가된 필드** — 온톨로지.md에는 있지만 aiProcessor.ts에 없는 항목, 또는 그 반대 항목을 모두 나열한다.

## 회귀 방지 핵심

- 새 태그 추가 시: ① 온톨로지.md → ② schema.ts.DEFAULT_TAGS → ③ aiProcessor.ts 카테고리 본문 → ④ 하위면 recordPipeline.ts.PARENT_TAG_MAP — 4곳 모두 갱신했는지 확인.
- 태그 이름 변경 시: 위 4곳 + DB 마이그레이션 필요 여부 확인.

## 출력 형식

```
✅ 일치 항목: ...
⚠️  불일치 항목: ...
❌ 누락 항목: ...
💡 권장 수정: ...
```

불일치가 없으면 "모든 항목 일치 ✓"로 끝낸다.
