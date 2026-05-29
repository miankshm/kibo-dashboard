# 🎨 Kibo Dashboard 프론트엔드 UI/UX 아키텍처 및 구현 지시서 (구현 반영본)

본 문서는 Kibo Sushi 2개 지점의 통합 관리를 위한 Kibo Dashboard의 프론트엔드 및 UI/UX 구현 지시서입니다.

중요: 기본적으로 나열된 기본 사항들은 절대 변경 불가합니다.

---

## 1. 프론트엔드 기술 스택 및 디자인 시스템 (Tech Stack & Theme)

- 코어 프레임워크: React (Next.js)
- 글로벌 상태 관리: Zustand 기반 전역 상태
- UI 라이브러리 및 컴포넌트: ShadCN UI (Tailwind CSS 기반)
- 데이터 테이블 기준: ShadCN DataTable (TanStack Table) 지향
- 폼 관리: ShadCN Form (React Hook Form + Zod)
- 데이터 시각화: Chart.js + react-chartjs-2
- 디자인 테마/컬러:
- 기본 테마: Light/Dark 모드 지원
- 포인트 컬러: Kibo Green 톤을 Primary/Accent 및 차트 핵심 컬러로 사용
- 배경/텍스트: 가독성 중심의 Black/White/Gray 계열 유지

구현 반영 메모:
- 현재 차트 섹션/캐러셀 인터랙션을 위해 embla-carousel-react 사용
- 날짜/로케일 표현에 date-fns 사용
- 다국어(ko/en), 다크모드, 사이드바 상태를 Zustand에서 통합 제어

---

## 2. 전체 레이아웃 아키텍처 (Layout Structure)

- 구조 방식: 한 화면 스크롤 구조 (Single Page Scroll)
- 사이드바 (반응형):
- 데스크탑: 좌측 고정형 사이드바
- 모바일: 좌측 Sheet 슬라이드 아웃
- 슬라이드 패널 (Right Drawer):
- 데이터 입력 폼 및 AI 분석 위젯은 우측 Sheet로 오픈
- 화면 전환 없이 컨텍스트 유지

구현 반영 상세:
- 상단 Header는 sticky 처리
- Header 우측 액션: Store 선택, AI 오픈, 언어 전환, 다크모드 전환
- 모바일에서는 우하단 Floating AI 버튼 제공

---

## 3. 핵심 UI 영역 및 컴포넌트 상세 명세

### 3.1. 상단 글로벌 컨트롤 영역 (Header / Top Section)

- Store 선택 영역:
- Header 내 Dropdown 기반 Store Selector 제공
- 전체 보기 / 지점별 전환 가능
- 전역 상태 변경 시 모든 대시보드 섹션 즉시 리렌더링
- 추가 글로벌 컨트롤:
- AI 위젯 오픈 아이콘 버튼
- 언어 전환 버튼 (ko/en)
- 다크모드 토글 버튼
- 모바일 메뉴 버튼 (사이드바 오픈)

### 3.2. 매출 요약 영역 (Sales Summary)

- UI 구성:
- 요약 카드 + 추이 차트
- 최근 일자 카드 영역은 캐러셀 기반
- 상세 데이터 포인트:
- 카드 항목: 매장 방문, 카드 결제, 현금 결제, 배달앱(Uber+DoorDash)
- 총매출(Gross) / 순매출(Net) 스위치 유지
- 기간 선택: 일별 / 주별 / 월별 탭
- 데이터 시각화:
- Line Chart 필수 원칙 유지
- 구현은 Bar + Line 혼합 오버레이 차트로 확장
- Green 계열 라인/포인트 색상 사용
- 동작 반영:
- Store 범위(전체/지점별)에 따라 차트 및 요약 값 스케일 반영
- 일별 카드는 최근 7일 기준으로 스와이프 탐색 가능

### 3.3. 현금 유입 분석 영역 (Cash Flow Analysis)

- UI 구성:
- 14일(2주) 단위 요약 카드 + 상세 리스트
- 최근 기간부터 탐색 가능한 캐러셀 구조
- 계산 로직:
- 예상 현금: cashSales 기반
- 실제 현금: actualClosingCash 기반
- 차액: actual - expected
- 표시 항목:
- 예상 현금, 실제 마감 현금, 차액, 전 2주 대비 증감
- 양수/음수에 따라 Green/Red 시각 강조
- 상세 리스트:
- 일자별 예상/실제/차액 배지 표시
- 차액 건수, 마이너스 건수 집계 문구 제공

### 3.4. 홀리데이 자동 조회 영역 (Holiday Comparison)

- UI 구성:
- 다가오는 홀리데이(1개월) 빠른 선택 버튼
- 전체 홀리데이 Select 선택
- 차트 기간 토글(작년/3년/5년)
- 테이블 뷰:
- 연도, 날짜, 매출, YoY 변화 컬럼 제공
- YoY 상승/하락 아이콘 및 색상 처리
- 차트 뷰:
- Bar Chart 기반 연도별 비교 시각화
- 바 상단 금액 라벨 표시
- 구현 반영 주의:
- 기본 지침의 DataTable 지향은 유지
- 현재 구현은 ShadCN Table 기반으로 동일 정보/비교 기능 제공

### 3.5. 데이터 입력 폼 (Data Entry Form)

- 접근 방식:
- 일일 매출 입력 버튼 클릭 시 우측 Drawer(Sheet) 오픈
- UI 구성:
- ShadCN Form 단독 사용
- Validation:
- Zod 기반 경량 검증
- 필수 날짜 검증
- 음수 금액 입력 방지
- 입력 항목:
- 지점 선택(전체 보기 상태에서만 필수 선택)
- 기준일(Date picker)
- Card, Cash
- Uber Eats, DoorDash, Cash and Carry
- Tips
- Actual Closing Cash
- 실시간 합산:
- 결제/배달 항목 합계 기반 Total Sales 표시
- 제출 동작:
- 저장 로딩 후 entry 기록
- 동일 지점+날짜 재입력 시 최신 값으로 갱신 저장

### 3.6. AI Agent Widget (매출 분석 비서)

- 접근 방식:
- Header 아이콘 또는 모바일 Floating 버튼으로 우측 Drawer 오픈
- UI 구성:
- 생성 버튼 + 로딩 상태 + 리포트 본문 + 빠른 질문 버튼
- UX 흐름:
- 리포트 생성 클릭
- 로딩 스피너/애니메이션 표시
- 분석 텍스트 리포트 렌더링
- 생성 시각 메타데이터 표시
- 리포트 초기화 액션 제공
- 현재 구현:
- Mock AI 응답 흐름(비동기 지연) 기반 동작
- 한국어/영어 리포트 내용 분기 지원

---

## 4. 프론트엔드 폴더 구조 (현재 워크스페이스 기준)

```text
app/
    layout.tsx
    page.tsx
    globals.css

components/
    layout/
        Header.tsx
        Sidebar.tsx
        PageContainer.tsx
    dashboard/
        StoreSelector.tsx
        SalesSummary.tsx
        CashFlowAnalysis.tsx
        HolidayComparison.tsx
        AIWidget.tsx
    forms/
        DailySalesForm.tsx
    providers/
        ThemeProvider.tsx
        LanguageSync.tsx
    ui/
        ...shadcn ui components

contexts/
    workflow-context.tsx

store/
    useStore.ts

lib/
    i18n.ts
    utils.ts
```

---

## 5. 상태 관리 및 워크플로우 명세 (구현 반영 추가)

- Zustand (앱 전역):
- selectedStoreId
- isSidebarOpen
- isDarkMode
- language
- Workflow Context (화면 워크플로우):
- drawerState (dailySalesForm, aiWidget)
- dailySalesEntries 기록/갱신
- aiAnalysis 상태(loading, lastReport, generatedAt)
- showGrossSales 토글
- selectedPeriod (daily/weekly/monthly)