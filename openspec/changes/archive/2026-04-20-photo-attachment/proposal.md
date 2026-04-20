## Why

음성 기록만으로는 피부 발진·행동 순간처럼 시각 정보가 핵심인 돌봄 상황을 담기 어렵다. 사진을 독립 기록 타입으로 추가해 텍스트 없이도 기록 가능하게 하고, 등대에서 "발진 경과 보여줘"처럼 시각 기반 질문에 썸네일 갤러리로 응답할 수 있게 한다.

## What Changes

- 녹음 버튼 영역에 사진 촬영 진입점 추가
- 사진 촬영 후 3가지 선택: **말하기** (음성/텍스트) / **AI 자동 태깅** / **그냥 저장**
- 사진 파일은 Supabase Storage에 업로드, URL을 records 테이블에 저장
- 사진 기록은 캘린더·태그 화면에서 썸네일로 표시
- 등대 답변에서 사진 관련 기록 조회 시 썸네일 갤러리 렌더링
- AI 자동 태깅: Gemini 멀티모달로 이미지 분석 → 태그 자동 생성 (월 AI 카운터 포함)
- 음성/텍스트 입력 시 기존 STT→AI요약→태그 파이프라인 그대로 활용

## Capabilities

### New Capabilities
- `photo-record`: 사진 독립 기록 타입 — 촬영, Supabase Storage 업로드, records 저장, 썸네일 표시
- `photo-ai-tagging`: 사진 AI 자동 태깅 — Gemini 멀티모달 이미지 분석, 태그 자동 생성, 월 카운터 포함
- `lighthouse-photo-gallery`: 등대 답변에서 사진 썸네일 갤러리 렌더링

### Modified Capabilities
- `ai-usage-counter`: AI 자동 태깅 호출도 월 카운터에 포함

## Impact

- **새 패키지**: `expo-image-picker`, `expo-image` (썸네일 최적화)
- **새 파일**: `src/services/photoService.ts` (촬영·업로드·AI태깅), `src/components/PhotoGallery.tsx`
- **수정 파일**: `src/db/schema.ts` (records에 photo_url 컬럼), `src/screens/HomeScreen.tsx` (사진 진입점), `src/screens/RecordDetailScreen.tsx` (사진 표시), `src/screens/CalendarScreen.tsx` (썸네일), `src/services/aiProcessor.ts` (이미지 분석 프롬프트), `src/services/absorbService.ts` (등대 갤러리 응답)
- **Supabase**: `photos` 버킷 생성, Storage RLS 설정
- **DB 마이그레이션**: records 테이블 v17 — photo_url TEXT 컬럼 추가
