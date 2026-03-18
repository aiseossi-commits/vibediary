---
name: AI 항해사 웹 서비스 연동 계획
description: 바다 앱 JSON 내보내기와 AI 항해사 웹 서비스 연동 관련 확정 결정사항
type: project
---

바다 앱과 AI 항해사(Next.js 웹)의 JSON 연동 구조 확정.

**Why:** 앱에서 녹음한 돌봄 기록을 웹에서 LLM 전수 분석 및 차트 시각화하기 위함.

**How to apply:** AI 항해사 연동 관련 작업 시 이 결정사항 기준으로 진행.

## 확정 결정사항 (2026-03-18)

### 파일 2종 분리
- `vibediary-backup-YYYYMMDD.json` — 디바이스 복원용, 기존 포맷 유지
- `bada-export-YYYYMMDD.json` — AI 항해사 전용, 웹 팀 합의 포맷

### bada-export 포맷
- `export_version: "1.0"`
- 타임스탬프: ISO 8601 (UTC)
- `raw_text` / `refined_text` 분리 (`summary` → `refined_text` 키 변환)
- 태그: 기록별 인라인 배열 `["#일상", "#식사"]`
- `structured_data: null` (앱 단 추출 없음)

### structured_data 처리 방식
- 앱: 항상 `null`로 내보냄 (추가 작업 없음)
- 웹: 최초 업로드 시 Gemini 1.5 Flash로 `raw_text` 일괄 파싱 → `temperature`, `medication`, `sleep_hours` 등 추출 → IndexedDB 캐싱

### 앱 측 남은 작업
- `exportForWeb()` main 반영 완료 — 추가 작업 없음
- 웹 팀 통합 테스트 요청 시 설정 화면에 버튼 노출
