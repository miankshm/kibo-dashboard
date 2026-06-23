# [Feature #15] Daily sales drawer UI update

---
> 🤖 **Cursor Agent 작업 지시서 (System Prompt)**
> 너는 에이전시의 수석 개발자다. 주어진 마스터 문서(@01_db_schema.md, @02_api_routes.md, @03_frontend_ui.md)는 시스템 뼈대 파악을 위해 반드시 읽되, 절대 직접 수정하지 마라.
> 
> **[작업 3단계 프로세스 - 엄수할 것]**
> 1. **작업 중**: 이 Feature MD의 요구사항과 마스터 MD(참조용)를 보고 코드를 짠다. 스택은 [Next.js + Tailwind + Neon/Supabase Auth]로 고정한다.
> 2. **작업 완료 직후**: 마스터 문서는 건드리지 말고, 이 Feature MD 하단 [반영된 최종 스펙]에 변경된 스펙만 요약 기록해라.
> 3. **다음 작업 시작 전 (역동기화 준비)**: 개발자가 별도의 '역동기화 프롬프트'를 내리기 전까지 마스터 문서는 현재 상태를 유지한다.
---

## 1. 요구사항 명세 (Issue Content)
현재 일일 매출 입력 드로어 UI 및 계산 로직 수정 필요

텍스트 변경:

* '기준일' → '날짜'로 변경
* '결제 수단별 매출' → '매장 방문 결제'로 변경

매장 방문 결제 섹션 수정:

* Card, Cash 필드 사이에 Paid Out 필드 추가
* 필드 순서: Card → Paid Out → Cash
* Paid Out은 카드 팁(Card Tip) 입력 필드임
* 섹션 제목 우측에 (Card + Cash) 합계 표시
* Paid Out 금액은 합계 계산에서 제외
* 표시 형식: /home/runner/work/_temp/b6e51f75-2f01-4d9f-b280-42196f8515b1.sh

배달 앱 매출 섹션 수정:

* Uber Eats, DoorDash만 유지
* DoorDash 아래 구분선 추가

Cash & Carry 분리:

* 구분선 아래에 Cash & Carry 단독 섹션으로 분리
* 배달 앱 매출 섹션에 포함하지 않음

마감 현금 섹션 수정:

* '기타' 텍스트 삭제
* '마감 현금'으로 변경
* 섹션 제목 우측에 (Cash - Paid Out) 값 표시
* 표시 형식: /home/runner/work/_temp/b6e51f75-2f01-4d9f-b280-42196f8515b1.sh

실제 마감 현금 입력 필드:

* '실제 마감 현금' 입력 필드 유지
* 사용자 직접 입력 받음

계산 로직:

* 매장 방문 결제 합계 = Card + Cash
* 마감 현금 = Cash - Paid Out
* Paid Out은 카드 팁 금액으로 취급
* Paid Out은 매장 방문 결제 합계에 포함하지 않음


## 2. 반영된 최종 스펙 (AI 작업 결과물)
### UI
- 일일 매출 드로어의 날짜 라벨을 `기준일`에서 `날짜`로 변경.
- 결제 섹션 라벨을 `결제 수단별 매출`에서 `매장 방문 결제`로 변경.
- 매장 방문 결제 입력 순서를 `Card -> Paid Out (Card Tip) -> Cash`로 재구성.
- 매장 방문 결제 섹션 우측에 실시간 합계(`Card + Cash`) 표시 추가.
- `Paid Out`은 표시/입력은 유지하되 매장 방문 결제 합계 계산에서 제외.
- 배달앱 매출 섹션은 `Uber Eats`, `DoorDash`만 유지하고 `DoorDash` 아래에 구분선 추가.
- `Cash & Carry`를 배달앱 매출에서 분리하여 독립 섹션으로 이동.
- `기타` 섹션을 제거하고 `마감 현금` 섹션으로 변경.
- 마감 현금 섹션 우측에 실시간 값(`Cash - Paid Out`) 표시 추가.
- `실제 마감 현금` 입력 필드는 기존대로 유지.

### 계산 로직
- 매장 방문 결제 합계: `Card + Cash`
- 마감 현금 표시값: `Cash - Paid Out`
- 총 매출 요약 계산은 기존과 동일하게 `Card + Cash + Uber Eats + DoorDash + Cash & Carry`

### i18n 문구
- 한국어/영어 번역 키에서 일일 매출 폼 문구를 위 UI 구조에 맞게 동기화.
- `Paid Out (Card Tip)` 및 `마감 현금/Closing cash` 제목 키를 추가.

### DB/API
- DB 스키마 변경 없음.
- API 계약 변경 없음.

---
### ⚠️ 개발자 전용: 역동기화 프롬프트 템플릿 (복사해서 사용)
아래 프롬프트를 복사하여 새 채팅창에 입력하고 마스터 문서를 최신화하세요.
```text
@01_db_schema.md @02_api_routes.md @03_frontend_ui.md @(현재 작업한 코드 폴더/파일들)
현재 구현된 실제 소스 코드를 정답으로 간주하고, 변경된 사항을 바탕으로 마스터 MD 파일 3개를 최신화(덮어쓰기)해. 코드는 절대 수정하지 마.
```
