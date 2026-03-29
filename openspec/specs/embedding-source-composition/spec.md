## Capability: embedding-source-composition

임베딩 소스 텍스트를 raw_text와 summary를 합성하여 생성한다.

## Requirements

1. `buildEmbeddingText(rawText, summary)` 함수는 raw_text와 summary를 `\n`으로 연결한 텍스트를 반환한다.
2. raw_text와 summary가 동일하면 중복 없이 하나만 반환한다.
3. 어느 하나가 없거나 빈 문자열이면 나머지 하나를 반환한다.
4. 모든 임베딩 생성 지점(recordPipeline, offlineQueue, 재색인)에서 이 함수를 사용한다.
