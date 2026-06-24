# [Feature #20] Fix sales summary cards data mismatch

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
- 일일 매출 입력 드로어에 저장한 데이터와 매출 요약 카드의 표시 값이 일치하지 않는 문제 수정
- 매출 요약 카드가 일일 매출 입력 데이터 기준으로 정확하게 계산 및 표시되도록 수정
- 각 카드의 계산 로직 검증
  - 매장 방문 = Card + Cash
  - 카드 결제 = Card(Paid Out은 포함하지 않음)
  - 현금 결제 = Cash
  - 배달앱 = Uber Eats + DoorDash
- 순매출은 배달앱에 수수료를 뺀 값(Uber Eats 23%, DoorDash 15%)
- 매출 입력 후 저장 또는 수정 시 매출 요약 카드가 즉시 최신 데이터로 반영되도록 수정
- 일일 매출 입력 데이터와 대시보드 KPI 카드 간 데이터 불일치 문제 해결

## 2. 반영된 최종 스펙 (AI 작업 결과물)
<!-- 코드 작업이 끝나면 변경된 스펙(DB/API/UI)을 여기에 요약해. -->

- UI: Sales Summary 캐러셀 카드는 총매출 비율 기반 임의 값 대신 일일 매출 입력의 실제 저장 필드값으로 계산한다.
- UI: 카드 계산식은 `매장 방문 = Card + Cash`, `카드 결제 = Card`, `현금 결제 = Cash`, `배달앱 = Uber Eats + DoorDash`를 사용한다.
- UI/API 동기화: 카드 상단 총액은 Gross 모드에서 `totalSales`, Net 모드에서 `netSales`를 사용하며, Net 값은 저장된 순매출 계산식(`Card + Cash + Cash & Carry + Uber Eats*0.77 + DoorDash*0.85`)을 그대로 따른다.
- UI: 배달앱 카드는 Gross 모드에서 총 배달매출을, Net 모드에서 수수료가 반영된 `Uber Eats*0.77 + DoorDash*0.85` 값을 표시하며 같은 기준으로 증감률도 계산한다.
- UI: Sales Summary 금액 표시는 정수면 소수 없이, 소수 금액이면 둘째 자리까지 유지해 `$xx.x0` 형태의 trailing zero도 생략하지 않는다.
- 상태 반영: 일일 매출 저장 또는 수정 후 `dataVersion` 변경을 트리거로 Sales Summary가 재조회되어 최신 카드 데이터가 즉시 반영된다.

---
### ⚠️ 개발자 전용: 역동기화 프롬프트 템플릿 (복사해서 사용)
아래 프롬프트를 복사하여 새 채팅창에 입력하고 마스터 문서를 최신화하세요.
```text
@01_db_schema.md @02_api_routes.md @03_frontend_ui.md @(현재 작업한 코드 폴더/파일들)
현재 구현된 실제 소스 코드를 정답으로 간주하고, 변경된 사항을 바탕으로 마스터 MD 파일 3개를 최신화(덮어쓰기)해. 코드는 절대 수정하지 마.
```
