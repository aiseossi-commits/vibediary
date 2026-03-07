## Context

`RecordDetailScreen`의 `handleDelete`는 Alert 확인 후 즉시 삭제를 실행하지만, 삭제 진행 중 상태를 관리하지 않아 중복 실행이 가능하다.

## Goals / Non-Goals

**Goals:**
- 삭제 중 중복 실행 방지
- 삭제 버튼 비활성화로 명확한 피드백 제공

**Non-Goals:**
- 토스트/스낵바 같은 별도 성공 알림 추가 (즉시 복귀가 더 자연스럽다)
- 삭제 취소(undo) 기능

## Decisions

### Decision 1: `isDeleting` 상태 추가

`useState<boolean>(false)`로 삭제 진행 상태를 관리한다. 삭제 시작 시 `true`, 완료/실패 시 `false`로 설정.

삭제 버튼의 `disabled` prop과 `opacity` 스타일을 `isDeleting`에 연동한다.

### Decision 2: Alert 내부에서 상태 제어

Alert의 "삭제" onPress 콜백 안에서 `isDeleting`을 `true`로 설정한다. Alert가 이미 확인을 담당하므로 별도 확인 단계 불필요.
