# 온톨로지 정합성 검사

`src/services/aiProcessor.ts`와 `~/Documents/Obsidian Vault/바다 세계관/온톨로지.md`를 읽고, 아래 항목이 일치하는지 검사한다.

## 검사 항목

1. **발달 영역 코드** — 온톨로지.md의 영역 코드(예: COM, MOT, SOC 등)가 aiProcessor.ts 프롬프트에 올바르게 반영되어 있는가?
2. **structured_data 스키마** — 온톨로지.md의 필드 정의(event_type, domain, ontology_code, is_milestone, antecedent, behavior, consequence 등)가 aiProcessor.ts 프롬프트 및 파싱 로직과 일치하는가?
3. **태그 계층** — 온톨로지.md의 태그 목록이 `src/db/schema.ts`의 DEFAULT_TAGS와 일치하는가?
4. **누락/추가된 필드** — 온톨로지.md에는 있지만 aiProcessor.ts에 없는 항목, 또는 그 반대 항목을 모두 나열한다.

## 출력 형식

```
✅ 일치 항목: ...
⚠️  불일치 항목: ...
❌ 누락 항목: ...
💡 권장 수정: ...
```

불일치가 없으면 "모든 항목 일치 ✓"로 끝낸다.
