# photo-ai-tagging

## Purpose

PhotoActionModal에서 "AI 자동 태깅"을 선택하면 Gemini 멀티모달로 이미지를 분석하여 적합한 태그를 자동 생성한다. 이 호출은 월 AI 카운터에 포함된다.

---

## Requirements

### Requirement: 사진 AI 자동 태깅
사용자가 PhotoActionModal에서 "AI 자동 태깅"을 선택하면 Gemini 멀티모달로 이미지를 분석해 적합한 태그를 자동 생성해야 한다(SHALL). 이 호출은 월 AI 카운터에 포함된다(SHALL).

#### Scenario: AI 자동 태깅 선택
- **WHEN** 사용자가 PhotoActionModal에서 "AI 자동 태깅"을 탭할 때
- **THEN** 월 AI 카운터를 확인하고, 한도 내이면 Gemini에 이미지 분석 요청을 보낸다

#### Scenario: 태그 자동 생성 및 저장
- **WHEN** Gemini가 이미지 분석 결과를 반환할 때
- **THEN** 반환된 태그를 records에 저장하고 사용자에게 생성된 태그 목록을 표시한다

#### Scenario: AI 카운터 한도 초과 시 차단
- **WHEN** 월 AI 사용 횟수가 10회 이상인 상태에서 "AI 자동 태깅"을 선택할 때
- **THEN** 호출을 차단하고 "그냥 저장"으로 대체 저장하며 한도 초과 안내를 표시한다
