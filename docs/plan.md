## Plan: UI API DB Stitching

현재 단계는 프론트엔드 UI와 API/DB 데이터를 연결하는 4단계 Stitching 작업이다. 권장 접근은 먼저 공통 TypeScript 타입과 mock API 계층을 세워 문서 간 계약을 고정하고, 그 다음 현재 하드코딩 UI를 가장 의존성이 낮은 순서대로 바인딩하는 것이다. 이 방식은 이후 실제 DB/외부 API로 교체할 때 프론트 변경 범위를 최소화한다.

**Steps**
1. Phase 1. 계약 고정 및 타입 계층 구축: [c:/git/portfolio/kibo-dashboard/docs/03_frontend_ui.md] 기준 UI 요구와 [c:/git/portfolio/kibo-dashboard/docs/02_api_routes.md], [c:/git/portfolio/kibo-dashboard/docs/01_db_schema.md]의 데이터 계약을 최종 소스로 삼고, 공통 TypeScript 타입 정의 위치를 먼저 만든다. 이 단계는 이후 모든 API/컴포넌트 작업의 선행 조건이다.
2. [c:/git/portfolio/kibo-dashboard/lib/types/domain.ts] 생성: Store, Sale, Holiday, HolidayHistoryRow, CashAnalysisWindow, AIReport, Admin, AuditLog 등의 핵심 도메인 타입을 정의한다. DB 컬럼명을 직접 노출하지 않고 프론트/API 계약인 camelCase를 기준으로 작성한다.
3. [c:/git/portfolio/kibo-dashboard/lib/types/api.ts] 생성: ApiSuccess, ApiError, PaginatedResponse, DashboardSummaryResponse, DashboardTrendResponse, CashAnalysisResponse, HolidayComparisonResponse 등 API 응답 래퍼 타입을 정의한다.
4. [c:/git/portfolio/kibo-dashboard/lib/types/forms.ts] 생성: DailySalesFormInput, DailySalesUpsertInput, AIAnalyzeRequest 등 폼/요청 payload 타입을 분리한다. 가능하면 현재 Zod 스키마와 1:1로 맞춘다.
5. [c:/git/portfolio/kibo-dashboard/lib/types/index.ts] 생성: 타입 barrel export를 제공해 컴포넌트와 API route에서 동일 import 경로를 사용하게 한다. 이 단계는 step 2-4 완료 후 진행한다.
6. Phase 2. mock 데이터 공급 계층 구축: 현재 app/api 폴더가 없으므로 Next App Router 기준 mock route handler를 신설한다. 이 단계는 프론트 컴포넌트가 실제 통신 모양을 먼저 갖추기 위한 임시 인프라다.
7. [c:/git/portfolio/kibo-dashboard/app/api/v1/stores/route.ts] 생성: `GET /api/v1/stores`를 구현하고 현재 store/useStore.ts의 STORES와 동일한 key/name 구조를 반환한다. `all`은 집계 전용 가상 옵션이므로 API 응답에는 포함 여부를 명확히 결정한다. 권장안은 포함하지 않고 프론트에서 합성 처리하는 방식이다.
8. [c:/git/portfolio/kibo-dashboard/app/api/v1/sales/route.ts] 생성: `POST /api/v1/sales`, `GET /api/v1/sales` mock route를 구현한다. POST는 동일 `storeKey + salesDate`를 upsert 처리하고, GET은 기간/스토어/정렬 파라미터를 받는다. 이 route는 Step 10의 DailySalesForm 바인딩 전 완료되어야 한다.
9. [c:/git/portfolio/kibo-dashboard/app/api/v1/dashboard/summary/route.ts], [c:/git/portfolio/kibo-dashboard/app/api/v1/dashboard/trends/route.ts], [c:/git/portfolio/kibo-dashboard/app/api/v1/dashboard/cash-analysis/route.ts] 생성: 현재 UI의 Sales Summary, Trend, Cash Flow가 기대하는 집계 구조를 mock 데이터로 반환한다. 세 route는 서로 병렬 구현 가능하지만 sales mock 저장소 구조는 공유해야 한다.
10. [c:/git/portfolio/kibo-dashboard/app/api/v1/holidays/route.ts], [c:/git/portfolio/kibo-dashboard/app/api/v1/holidays/upcoming/route.ts], [c:/git/portfolio/kibo-dashboard/app/api/v1/holidays/comparison/route.ts] 생성: 전체 목록, 1개월 내 다가오는 holiday, 1y/3y/5y 비교 데이터를 분리 제공한다. HolidayComparison 컴포넌트가 차트와 테이블을 동시에 렌더링하므로 comparison 응답 하나에 holiday 메타데이터, chart 데이터, history 배열을 함께 담는 구조를 유지한다.
11. [c:/git/portfolio/kibo-dashboard/app/api/v1/ai/analyze/route.ts] 생성: `POST /api/v1/ai/analyze` mock route를 구현한다. 현재 UI는 “이번 주 분석 리포트 생성” 단일 액션 중심이므로 기본 analysisType은 weekly로 두고, 요청에 storeKey/startDate/endDate/analysisType를 받는 구조를 유지한다.
12. Phase 3. 프론트 통신 유틸 및 상태 연결: fetch 호출을 각 컴포넌트에 흩뿌리지 말고 공통 클라이언트 함수 계층을 먼저 만든다. 이 단계는 UI 바인딩 복잡도를 줄이기 위한 준비다.
13. [c:/git/portfolio/kibo-dashboard/lib/api/client.ts] 생성: JSON fetch wrapper, error normalization, querystring 생성 유틸을 정의한다.
14. [c:/git/portfolio/kibo-dashboard/lib/api/dashboard.ts], [c:/git/portfolio/kibo-dashboard/lib/api/sales.ts], [c:/git/portfolio/kibo-dashboard/lib/api/holidays.ts], [c:/git/portfolio/kibo-dashboard/lib/api/ai.ts] 생성: route별 호출 함수를 정의한다. step 9-11의 route와 1:1 대응시킨다.
15. [c:/git/portfolio/kibo-dashboard/contexts/workflow-context.tsx] 수정: 현재 in-memory 중심 상태를 “UI workflow state + fetched data cache + async action” 역할로 정리한다. 특히 `generateAIReport`, `recordDailySalesEntry`, `dailySalesEntries`, `aiAnalysis`, `showGrossSales`, `selectedPeriod` 주변에 API 호출 및 로딩/에러 상태를 연결한다.
16. [c:/git/portfolio/kibo-dashboard/store/useStore.ts] 수정: 전역 store는 선택 지점, 언어, 다크모드, 사이드바 열림 상태만 유지하고 서버 데이터는 넣지 않는다. 단, auth 또는 storeKey 규칙을 중앙 관리해야 한다면 최소 범위의 타입 보강만 수행한다.
17. Phase 4. 하드코딩 UI 데이터 바인딩: 가장 사용자가 데이터를 입력하고 그 결과를 즉시 확인하는 흐름부터 연결한다. 즉 Form → Summary/Cash → Holiday → AI 순서가 최적이다.
18. [c:/git/portfolio/kibo-dashboard/components/forms/DailySalesForm.tsx] 수정: submit 시 workflow-context의 로컬 저장 대신 `/api/v1/sales` POST 호출로 바꾼다. `selectedStoreId === 'all'`일 때는 사용자 선택 storeId를 강제하고, 성공 시 관련 대시보드 데이터를 재조회하도록 흐름을 연결한다. 이 단계는 이후 Summary/Cash 컴포넌트의 실데이터 반영 트리거 역할도 한다.
19. [c:/git/portfolio/kibo-dashboard/components/dashboard/SalesSummary.tsx] 수정: 현재 deterministic mock 생성, mockSalesData, carousel slide 계산을 API 응답 기반으로 교체한다. 바인딩 순서는 `storeKey`, `selectedPeriod`, `showGrossSales`를 query로 보내고, 응답에서 total/periodTotal/chart dataset/card metrics를 받아 렌더링하는 구조다. 최근 7일 카드 캐러셀을 계속 유지하려면 summary route 응답에 `dailyCards[]`를 포함시키는 것이 가장 단순하다.
20. [c:/git/portfolio/kibo-dashboard/components/dashboard/CashFlowAnalysis.tsx] 수정: 현재 sample entry 생성 로직을 제거하고 `/api/v1/dashboard/cash-analysis` 응답의 `windows[]`와 `details[]`를 그대로 사용한다. 이 컴포넌트는 Step 19와 병렬 가능하지만, DailySalesForm 제출 후 재조회 흐름은 동일하게 맞춰야 한다.
21. [c:/git/portfolio/kibo-dashboard/components/dashboard/HolidayComparison.tsx] 수정: 하드코딩 `mockHolidayData` 제거 후, 초기 load 시 `GET /holidays`와 `GET /holidays/upcoming`을 읽고, 선택값이 바뀔 때 `GET /holidays/comparison`을 재호출한다. 차트 범위 토글(1y/3y/5y), storeKey, selectedHolidayId가 주요 query dependency다.
22. [c:/git/portfolio/kibo-dashboard/components/dashboard/AIWidget.tsx] 수정: 현재 mock `generateAIReport` 대신 `/api/v1/ai/analyze` POST를 호출한다. 응답의 summary/generatedAt을 현재 drawer UI에 바인딩하고, quick question 버튼은 우선 같은 endpoint를 다른 analysisType 또는 promptVariant로 호출하는 확장 포인트로 남긴다.
23. [c:/git/portfolio/kibo-dashboard/app/page.tsx] 필요 시 수정: 페이지 단위에서 초기 prefetch가 필요하면 여기서 하고, 그렇지 않으면 각 섹션 컴포넌트 내부 fetch로 유지한다. 현재 구조상 큰 변화 없이 유지 가능하므로 우선 수정 후보로만 둔다.
24. 문서 정합성 유지: 실제 Stitching 구현 중 route shape나 type naming이 바뀌면 [c:/git/portfolio/kibo-dashboard/docs/02_api_routes.md]와 [c:/git/portfolio/kibo-dashboard/docs/01_db_schema.md]를 후속 동기화한다. 이는 구현 이후 검증 단계에서 처리한다.

**Relevant files**
- `c:/git/portfolio/kibo-dashboard/docs/03_frontend_ui.md` — Stitching 작업의 UI 요구 기준. Store selector, Sales Summary, Cash Flow, Holiday, Daily Sales Form, AI Widget의 렌더링 요구를 재사용.
- `c:/git/portfolio/kibo-dashboard/docs/02_api_routes.md` — mock route shape와 요청/응답 계약의 기준. 실제 route handler는 이 문서를 그대로 구현 대상으로 삼는다.
- `c:/git/portfolio/kibo-dashboard/docs/01_db_schema.md` — camelCase API와 snake_case DB 매핑 규칙, stores.key, actual_closing_cash 표준화 기준.
- `c:/git/portfolio/kibo-dashboard/contexts/workflow-context.tsx` — 현재 UI 상태, mock AI, in-memory daily sales entry 관리 지점. Stitching의 중심 수정 파일.
- `c:/git/portfolio/kibo-dashboard/store/useStore.ts` — selectedStoreId, language, dark mode, sidebar 상태를 보유. API query의 공통 입력값 제공.
- `c:/git/portfolio/kibo-dashboard/components/forms/DailySalesForm.tsx` — 첫 번째 API write 연결 지점. 폼 제출 후 대시보드 갱신 체인의 시작점.
- `c:/git/portfolio/kibo-dashboard/components/dashboard/SalesSummary.tsx` — 현재 가장 많은 하드코딩 집계/mock 생성 로직이 존재하는 바인딩 우선순위 1 컴포넌트.
- `c:/git/portfolio/kibo-dashboard/components/dashboard/CashFlowAnalysis.tsx` — 14일 윈도우 기반 응답 구조를 요구하는 분석 UI.
- `c:/git/portfolio/kibo-dashboard/components/dashboard/HolidayComparison.tsx` — 목록/upcoming/comparison 3종 API가 필요한 복합 바인딩 컴포넌트.
- `c:/git/portfolio/kibo-dashboard/components/dashboard/AIWidget.tsx` — mock AI 결과를 API 호출로 치환하는 drawer UI.
- `c:/git/portfolio/kibo-dashboard/app/api/v1/**` — 현재 부재. 이번 Stitching 단계에서 신설될 mock route 계층.
- `c:/git/portfolio/kibo-dashboard/lib/types/**` — 이번 단계에서 신설될 공통 타입 계층.
- `c:/git/portfolio/kibo-dashboard/lib/api/**` — 이번 단계에서 신설될 프론트 API 클라이언트 계층.

**Verification**
1. 타입 검증: 새로 만든 `lib/types`와 `lib/api`를 import한 컴포넌트/route에서 TypeScript 오류가 없어야 한다.
2. API 계약 검증: `/api/v1/stores`, `/api/v1/sales`, `/api/v1/dashboard/summary`, `/api/v1/dashboard/trends`, `/api/v1/dashboard/cash-analysis`, `/api/v1/holidays`, `/api/v1/holidays/upcoming`, `/api/v1/holidays/comparison`, `/api/v1/ai/analyze`가 문서와 동일한 shape를 반환하는지 확인한다.
3. 폼 흐름 검증: Daily Sales Form 제출 후 저장 성공, drawer close, Summary/Cash 섹션 재조회까지 연결되는지 확인한다.
4. 스토어 필터 검증: `all`, `kibo-north`, `kibo-south` 전환 시 Summary/Cash/Holiday/AI 요청 파라미터가 올바르게 바뀌는지 확인한다.
5. 기간/모드 검증: Summary의 `daily|weekly|monthly`, `gross|net`, Holiday의 `1y|3y|5y`, CashAnalysis의 14일 윈도우가 UI와 응답 구조 모두에서 일치하는지 확인한다.
6. 새로고침 검증: 현재는 mock API + in-memory 저장소일 가능성이 높으므로 새로고침 시 데이터 지속 여부를 명확히 확인하고, 지속되지 않는다면 문서/주석에 임시 제약으로 명시한다.
7. 문서 검증: 구현 완료 후 docs 01/02/03과 실제 route/type/컴포넌트 계약 간 차이가 없는지 다시 대조한다.

**Decisions**
- 이번 단계는 “Stitching”이므로 실제 PostgreSQL/Prisma 연결은 범위에서 제외하고 mock route handler + in-memory 또는 fixture 기반 응답으로 제한한다.
- 공통 타입은 프론트와 route handler가 함께 쓰는 `lib/types`에 둔다. 컴포넌트 로컬 interface는 최소화한다.
- `storeKey`를 프론트/API 기준 식별자로 사용하고, DB UUID는 이후 실제 백엔드 연결 단계에서 내부 변환 대상으로 둔다.
- `actualClosingCash`는 API/프론트 표준 명칭으로 유지하고 DB 매핑은 `actual_closing_cash`로 고정한다.
- `tips`와 `cardTip`의 정책 차이는 이번 단계에서 API 타입 문서에 명시하고 mock route에서는 하나의 canonical field로 통일한다.

**Further Considerations**
1. mock persistence 방식 선택: Option A는 route module-scope 메모리 저장, Option B는 JSON fixture 파일 기반 저장이다. Stitching 단계는 구현 속도가 중요한 만큼 Option A 권장.
2. data fetching 위치 선택: Option A는 workflow-context 중심 fetch/cache, Option B는 각 섹션 컴포넌트 직접 fetch다. 현재 구조상 cross-refresh와 submit-trigger 관리가 필요하므로 Option A 권장.
3. holiday API 설계는 단일 comparison endpoint에 chart/history를 같이 실어주는 방향이 가장 단순하며, 현재 UI 구조와도 가장 잘 맞는다.
