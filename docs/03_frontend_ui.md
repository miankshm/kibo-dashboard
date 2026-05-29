# 🎨 Kibo Dashboard 프론트엔드 UI/UX 아키텍처 및 구현 지시서

본 문서는 Kibo Sushi 2개 지점의 통합 관리를 위한 'Kibo Dashboard'의 프론트엔드 및 UI/UX 구현을 위한 상세 지시서입니다. 프론트엔드 개발자는 아래의 레이아웃 구조, 컴포넌트 스펙, 상태 관리 및 테마 지침을 엄격하게 준수하여 구현해야 합니다.

---

## 1. 프론트엔드 기술 스택 및 디자인 시스템 (Tech Stack & Theme)

* **코어 프레임워크:** React (Next.js 권장)
* **글로벌 상태 관리:** Zustand (또는 Redux Toolkit) - 지점(Store) 선택 상태 관리에 최적화
* **UI 라이브러리 및 컴포넌트:** **ShadCN UI** (Tailwind CSS 기반)
* **데이터 테이블:** ShadCN DataTable (**TanStack Table** 기반)
* **폼(Form) 관리:** **ShadCN Form** (React Hook Form + Zod 조합으로 Light validation 적용)
* **데이터 시각화 (차트):** **Chart.js** + **`react-chartjs-2`**
* **디자인 테마 및 컬러:** * **기본 테마:** ShadCN Light/Dark 모드 완벽 지원.
    * **포인트 컬러:** Kibo Sushi 브랜드 컬러인 **Green 톤**을 Primary/Accent 컬러로 적용 (예: Tailwind 클래스 `primary`, 버튼, 차트 라인 포인트 컬러 등에 사용). 배경과 텍스트는 가독성을 위해 Black/White/Gray 계열 유지.
    * **벤치마킹:** Square (직관적인 매출 뷰), Shopify (깔끔한 데이터 시각화), Google Analytics (명확한 기간 비교 레이아웃).

---

## 2. 전체 레이아웃 아키텍처 (Layout Structure)

* **구조 방식:** **한 화면 스크롤 구조 (Single Page Scroll)** - 모바일 친화적으로 설계되어 상하 스크롤을 통해 모든 섹션을 확인할 수 있어야 함.
* **사이드바 (Navigation):** **옵션 C - 모바일/데스크탑 반응형 Sidebar** 적용. 
    * ShadCN `Sheet` 또는 `Drawer`를 활용하여 모바일에서는 햄버거 메뉴 클릭 시 슬라이드 아웃 되도록 구현. 
    * 데스크탑에서는 고정(Fixed) 또는 접이식(Collapsible) 사이드바로 동작.
* **슬라이드 패널 (Right Drawer):** 데이터 입력 및 AI 분석 등 부가적인 액션은 화면 전환 없이 **우측 Drawer (ShadCN `Sheet`)**로 열리도록 구현하여 컨텍스트(맥락)를 유지.

---

## 3. 핵심 UI 영역 및 컴포넌트 상세 명세

### 3.1. 상단 글로벌 컨트롤 영역 (Header / Top Section)
* **Store 선택 영역 (Store Selector):**
    * **위치:** 페이지 최상단 Header 또는 대시보드 스크롤 최상단 섹션에 배치.
    * **기능:** Kibo Sushi 2개 지점 중 하나를 선택하거나 '전체 보기'를 선택할 수 있는 Dropdown 또는 Toggle.
    * **상태 연동:** 여기서 선택된 값은 Zustand/Redux의 전역 상태(Global State)로 관리되며, 변경 즉시 아래의 모든 대시보드 컴포넌트가 해당 지점 데이터로 리렌더링 되어야 함.

### 3.2. 매출 요약 영역 (Sales Summary)
* **UI 구성:** ShadCN `Card` 컴포넌트를 활용한 그리드 레이아웃. 일/주/월 매출 비교 카드 배치.
* **상세 데이터 포인트:**
    * 일 매출 내역: 매장방문(Instore), 카드(Card), 현금(Cash), Uber Eats, Door Dash, Cash&Carry 로 세분화하여 표시.
    * 토글 버튼: 총매출(Gross) / 순매출(Net) 전환 스위치 (ShadCN `Switch` 사용).
* **데이터 시각화:** `react-chartjs-2`를 사용한 **Line Chart (추이 그래프) 필수**. x축은 기간(일/주/월), y축은 매출액. 브랜드 컬러인 Green 계열을 차트 라인 컬러로 적용.

### 3.3. 현금 유입 분석 영역 (Cash Flow Analysis)
* **UI 구성:** 직전 14일(2주) 단위 집계 데이터를 보여주는 Summary Card 및 리스트.
* **상세 데이터 포인트:**
    * 계산 로직: (현금결제 매출 기준 예상 현금) vs (실제 마감 현금 `actual_closing_cash`) 비교.
    * 표시 항목: 차액 발생 여부, 직전 2주 대비 증감액 및 증감률(%)을 양수/음수에 따라 색상(Green/Red)으로 구분하여 렌더링.

### 3.4. 홀리데이 자동 조회 영역 (Holiday Comparison) - [핵심 시각화 영역]
* **UI 구성:** 다가오는 홀리데이를 식별하고, 과거 1~2년 전 동기 홀리데이 매출을 나란히 비교.
* **테이블 뷰:** **ShadCN DataTable (TanStack Table)**을 사용하여 과거 연도별 동기 홀리데이 매출 데이터를 그리드 형태로 명확하게 렌더링. (정렬 기능 제공)
* **차트 뷰:** `react-chartjs-2`를 활용한 Bar Chart (막대 그래프) 또는 Line Chart로 연도별 같은 홀리데이의 매출 볼륨을 시각적으로 직관성 있게 비교.

### 3.5. 데이터 입력 폼 (Data Entry Form)
* **접근 방식:** 화면 내 '일일 매출 입력' 버튼 클릭 시 **우측 Drawer (ShadCN `Sheet`)**로 오픈.
* **UI 구성:** **ShadCN Form** 단독 사용. 
* **검증 (Validation):** Zod를 활용한 Light validation (예: 필수 숫자 필드 검증, 마이너스 금액 입력 방지 등).
* **입력 항목:** 기준일(Date picker), 결제수단별 매출(Card, Cash 등), 팁, 배달앱 매출, 실제 마감 현금(`actual_closing_cash`).

### 3.6. AI Agent Widget (매출 분석 비서)
* **접근 방식:** 우측 하단 Floating Button 또는 상단 네비게이션 아이콘 클릭 시 **우측 Drawer (ShadCN `Sheet`)**로 오픈.
* **UI 구성:** 챗봇 형태의 채팅창 레이아웃 또는 리포트 요약 카드 레이아웃.
* **UX 흐름:** 사용자가 '이번 주 분석 리포트 생성' 버튼 클릭 -> 로딩 스피너 작동 -> AI API 응답 수신 후 자연어 기반의 인사이트("이번 주 매출은 지난주 대비 X% 증가했으며...") 텍스트 렌더링.

---

## 4. 프론트엔드 폴더 구조 (제안)

```text
src/
├── components/
│   ├── ui/                # ShadCN UI 자동 생성 컴포넌트들 (button, sheet, form, table 등)
│   ├── layout/            # Sidebar, Header, PageContainer 컴포넌트
│   ├── dashboard/         # 도메인 특정 컴포넌트
│   │   ├── SalesSummary.tsx       # 차트 및 요약 카드 (react-chartjs-2 포함)
│   │   ├── CashFlowAnalysis.tsx   # 현금 추적 뷰
│   │   ├── HolidayComparison.tsx  # ShadCN DataTable 기반 홀리데이 분석
│   │   └── StoreSelector.tsx      # 지점 선택 글로벌 토글
│   └── forms/
│       └── DailySalesForm.tsx     # ShadCN Form 및 우측 Drawer 연결
├── store/                 
│   └── useStore.ts        # Zustand 기반 글로벌 상태 (선택된 지점 ID 관리 등)
├── lib/
│   └── utils.ts           # 테마 클래스 병합(cn) 및 기타 유틸
└── app/ (또는 pages/)     # 라우팅
    └── page.tsx           # 모바일 친화적 원페이지 스크롤 대시보드 메인