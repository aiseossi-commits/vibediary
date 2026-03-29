## Approach

임베딩 소스 텍스트를 생성하는 순수 함수 `buildEmbeddingText(rawText, summary)`를 도입한다. 이 함수를 `recordPipeline.ts`, `offlineQueue.ts`, `SettingsScreen.tsx` 세 곳에서 공통으로 사용한다.

## buildEmbeddingText 설계

```typescript
// src/services/aiProcessor.ts 내부에 추가
export function buildEmbeddingText(rawText: string | null, summary: string): string {
  const raw = rawText?.trim() || '';
  const sum = summary?.trim() || '';
  if (raw && sum && raw !== sum) {
    return `${raw}\n${sum}`;
  }
  return raw || sum;
}
```

- raw와 summary가 모두 있고 다를 때만 합침
- 동일하면 중복 없이 하나만 사용
- 어느 하나만 있으면 있는 것 사용

## 변경 위치

| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `recordPipeline.ts` L47, L87 | `generateEmbedding(text \|\| aiResult.summary)` | `generateEmbedding(buildEmbeddingText(text, aiResult.summary))` |
| `offlineQueue.ts` L97 | `generateEmbedding(item.raw_text \|\| result.summary)` | `generateEmbedding(buildEmbeddingText(item.raw_text, result.summary))` |
| `SettingsScreen.tsx` L321 | `record.raw_text \|\| record.summary` | `buildEmbeddingText(record.raw_text, record.summary)` |

## 결정 사항

- `buildEmbeddingText`는 `aiProcessor.ts`에 배치 (generateEmbedding과 같은 파일)
- 구분자는 `\n` (공백보다 임베딩 모델이 더 명확히 구분)
- 기존 임베딩은 건드리지 않음 — 필요 시 재색인 버튼으로 업데이트
