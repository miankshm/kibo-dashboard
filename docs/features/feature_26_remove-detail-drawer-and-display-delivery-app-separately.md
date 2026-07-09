# [Feature #26] Remove detail drawer and display delivery app separately

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
## Background
- 현재 매출 검색 페이지에서 검색 결과 Row를 클릭하면 상세 Drawer가 열림.
- 하지만 Drawer에는 테이블과 동일한 정보만 카드 형태로 다시 표시되고 있어 추가적인 정보 제공이 없음.
- 또한 검색 결과 테이블에서 배달앱이 하나의 컬럼으로 표시되어 Uber Eats와 DoorDash 매출을 각각 확인하기 어려움.

## Requirements
- 검색 결과 Row 클릭 시 열리는 상세 Drawer를 제거할 것.
- 검색 결과는 테이블만으로 확인할 수 있도록 구성할 것.
- '배달앱' 컬럼을 제거하고 다음 두 개의 컬럼으로 분리할 것.
  - Uber Eats
  - DoorDash
- 컬럼 순서는 아래와 같이 구성할 것.
  - 날짜
  - 매장
  - 총매출(Gross)
  - 순매출(Net)
  - 카드결제
  - 현금결제
  - Uber Eats
  - DoorDash
  - Cash & Carry

## Expected Result
- 중복된 상세 화면이 제거되어 검색 페이지가 더욱 단순하고 직관적으로 동작함.
- Uber Eats와 DoorDash 매출을 각각 확인할 수 있어 데이터 가독성이 향상됨.
- 검색 결과만으로 필요한 정보를 모두 확인할 수 있음.

## 2. 반영된 최종 스펙 (AI 작업 결과물)
<!-- 코드 작업이 끝나면 변경된 스펙(DB/API/UI)을 여기에 요약해. -->

---
### ⚠️ 개발자 전용: 역동기화 프롬프트 템플릿 (복사해서 사용)
아래 프롬프트를 복사하여 새 채팅창에 입력하고 마스터 문서를 최신화하세요.
```text
@01_db_schema.md @02_api_routes.md @03_frontend_ui.md @(현재 작업한 코드 폴더/파일들)
현재 구현된 실제 소스 코드를 정답으로 간주하고, 변경된 사항을 바탕으로 마스터 MD 파일 3개를 최신화(덮어쓰기)해. 코드는 절대 수정하지 마.
```
