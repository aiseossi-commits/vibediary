## Context

Whisper는 무음이나 배경 소음에서 한국 유튜브 자막 패턴을 환각으로 생성하는 경향이 있다.

## Goals / Non-Goals

**Goals:**
- 알려진 환각 패턴 차단

**Non-Goals:**
- ML 기반 환각 탐지
- 모든 언어 패턴 커버

## Decisions

### Decision 1: 블랙리스트 + 최소 길이 조합

10자 미만은 유의미한 기록이 아닐 가능성이 높다. 블랙리스트는 실제 관찰된 패턴만 포함: '시청해주셔서 감사합니다', '구독과 좋아요', 'MBC 뉴스', 'KBS 뉴스', '안녕하세요', 'thank you for watching', 'thanks for watching', 'please subscribe'.
