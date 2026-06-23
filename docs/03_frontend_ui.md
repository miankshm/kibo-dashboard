# 03_frontend_ui.md

# Kibo Dashboard 프론트엔드 UI/UX 아키텍처 및 구현 지시서 (실구현 Reverse-Sync 반영본)

본 문서는 현재 코드 구현을 기준으로 프론트엔드 문서를 역동기화한 기준안이다.

중요 Store 규칙:
- 운영 지점: St. Clair, Woodbridge
- 전역 선택 값: `all`, `st-clair`, `woodbridge`
- 화면 표시명: All Stores, St. Clair, Woodbridge (언어별 로컬라이즈 포함)

---

## 1. 프론트엔드 기술 스택 및 디자인 시스템

- 코어 프레임워크: Next.js App Router (`next@16`, `react@19`)
- 전역 상태: Zustand (`store/useStore.ts`)
- 워크플로우 상태: React Context (`contexts/workflow-context.tsx`)
- UI 컴포넌트: ShadCN UI 계열 컴포넌트
- 스타일링: Tailwind CSS v4 (`app/globals.css`)
- 차트: Chart.js + react-chartjs-2
- 캐러셀: embla-carousel-react
- 폼: React Hook Form + Zod
- 날짜 포맷: date-fns
- 아이콘: lucide-react

테마/디자인 실제 반영:
- `app/globals.css`에서 OKLCH 기반 커스텀 토큰 사용
- Primary/Success를 Kibo Green 계열로 정의
- Light/Dark 토큰 모두 정의, `ThemeProvider`가 `html.dark` class 토글
- 폰트는 Geist/Geist Mono 사용 (`app/layout.tsx`)

주의:
- `styles/globals.css` 파일이 있으나 현재 `app/layout.tsx`에는 `app/globals.css`만 import되어 실제 적용은 `app/globals.css` 기준이다.

---

## 2. 전체 레이아웃 아키텍처

- 라우팅: 현재 사용자 페이지는 `app/page.tsx` 단일 대시보드
- 구조: 단일 스크롤 페이지 + 섹션 앵커 이동
- 데스크탑:
  - 좌측 고정 Sidebar (`lg:w-64`)
  - Header sticky (`top-0`) + 본문
- 모바일:
  - Sidebar를 Sheet(왼쪽 슬라이드)로 오픈
  - 우하단 Floating AI 버튼 제공
- 우측 Drawer(Sheet):
  - Daily Sales Form
  - AI Widget

---

## 3. 핵심 UI 영역 및 컴포넌트 상세 명세

### 3.1 Header / 글로벌 컨트롤

구성 컴포넌트: `components/layout/Header.tsx`

기능:
- 모바일 메뉴 버튼 -> Sidebar Sheet 토글
- Store Selector Dropdown
- AI 위젯 오픈 버튼
- 언어 토글 버튼 (ko/en)
- 다크모드 토글 버튼

Store 선택값 변경은 Zustand 전역 상태(`selectedStoreId`)를 갱신하며, 하위 대시보드 섹션 데이터 재조회 트리거로 사용된다.

### 3.2 Sidebar

구성 컴포넌트: `components/layout/Sidebar.tsx`

네비게이션 앵커:
- `#dashboard`
- `#sales`
- `#cashflow`
- `#holiday`
- Daily Sales 입력 액션(드로어 오픈)
- `#settings` (현재 별도 섹션 구현 없음)

### 3.3 Sales Summary

구성 컴포넌트: `components/dashboard/SalesSummary.tsx`

실동작:
- 최근 8개 sales 항목을 캐러셀 카드로 표시
- Gross/Net 스위치 (`showGrossSales`)
- 기간 탭 (`daily|weekly|monthly`)
- 차트는 Bar + Line 오버레이

API 호출:
- `GET /api/v1/sales`
- `GET /api/v1/dashboard/trends`

참고:
- 카드 내 방문/카드/현금/배달 값은 실제 DB 원본 직접필드가 아니라 UI 계산값(총매출 기반 비율/변화 계산)으로 구성된다.

### 3.4 Cash Flow Analysis

구성 컴포넌트: `components/dashboard/CashFlowAnalysis.tsx`

실동작:
- 14일 단위 window를 5개(`PERIOD_COUNT=5`) 캐러셀로 표시
- 예상/실제/차액/전기간 대비 카드 표시
- 상세 리스트에서 날짜별 badge 표시

API 호출:
- `GET /api/v1/dashboard/cash-analysis?periodDays=14&windowCount=5`

### 3.5 Holiday Comparison

구성 컴포넌트: `components/dashboard/HolidayComparison.tsx`

실동작:
- 다가오는 홀리데이 버튼 + 전체 홀리데이 Select
- 기간 토글: `1y|3y|5y`
- Bar 차트 + 상단 값 라벨 플러그인
- 연도별 표(Table) + YoY 상승/하락 아이콘

API 호출:
- `GET /api/v1/holidays`
- `GET /api/v1/holidays/upcoming`
- `GET /api/v1/holidays/comparison`

### 3.6 Daily Sales Form (우측 Drawer)

구성 컴포넌트: `components/forms/DailySalesForm.tsx`

검증/동작:
- Zod 스키마
- 날짜 필수, 금액 음수 불가
- `selectedStoreId === all`일 때만 store 선택 필드 노출
- 저장 전 최종 store는 반드시 `st-clair|woodbridge`
- 상단 라벨 변경: `날짜`, `매장 방문 결제`, `마감 현금`
- 매장 방문 결제 입력 순서: `Card -> Paid Out(Card Tip) -> Cash`
- 매장 방문 결제 섹션 우측에 `(Card + Cash)` 금액 실시간 표시 (`Paid Out` 제외)
- 배달앱 매출은 `Uber Eats`, `DoorDash`만 포함하고 DoorDash 하단 구분선 표시
- `Cash & Carry`는 배달앱 섹션과 분리된 단독 입력 영역으로 표시
- 마감 현금 섹션 우측에 `(Cash - Paid Out)` 금액 실시간 표시
- 총합(`Total Sales`) 실시간 계산 표시 (`Card + Cash + UberEats + DoorDash + Cash&Carry`)
- 예상 마감 현금(`Cash Sales - Paid Out(Card Tip)`) 실시간 계산 표시
- 순매출(`Card + Cash + Cash & Carry + UberEats*0.77 + DoorDash*0.85`) 저장

제출 플로우:
1. 1.5초 로딩 시뮬레이션
2. Workflow의 `recordDailySalesEntry` 호출
3. 내부에서 `POST /api/v1/sales` upsert
4. 성공 시 폼 초기화 + Drawer 닫기

### 3.7 AI Widget (우측 Drawer)

구성 컴포넌트: `components/dashboard/AIWidget.tsx`

실동작:
- 리포트 생성 버튼
- 로딩 애니메이션
- 생성 시각 표시
- 리포트 초기화 버튼
- 빠른 질문 버튼(현재 동일 generate handler 재사용)

API 호출:
- `POST /api/v1/ai/analyze`

---

## 4. 프론트엔드 폴더 구조 (현재 구현 기준)

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/v1/**/route.ts

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
    shadcn 기반 공통 컴포넌트

contexts/
  workflow-context.tsx

store/
  useStore.ts

lib/
  i18n.ts
  api/*.ts
  db-queries.ts
  schema.ts
  types/*
```

---

## 5. 상태 관리 및 워크플로우 명세

## 5.1 Zustand 전역 상태 (`store/useStore.ts`)

- `selectedStoreId`: `all|st-clair|woodbridge`
- `isSidebarOpen`: 모바일 사이드바 열림 상태
- `isDarkMode`: 다크모드 상태
- `language`: `ko|en`

보조 상수:
- `STORES`: 화면용 store 메타(로컬라이즈 텍스트)

## 5.2 Workflow Context (`contexts/workflow-context.tsx`)

- Drawer 상태: `dailySalesForm`, `aiWidget`
- Daily Sales:
  - `dailySalesFormData`
  - `dailySalesEntries`
  - `recordDailySalesEntry()`
  - `dataVersion` (데이터 갱신 트리거)
- AI 상태:
  - `aiAnalysis.isLoading`
  - `aiAnalysis.lastReport`
  - `aiAnalysis.reportGeneratedAt`
  - `generateAIReport()`, `clearAIReport()`
- 표시 상태:
  - `showGrossSales` + `toggleSalesMode()`
  - `selectedPeriod` (`daily|weekly|monthly`)

Store 워크플로우 규칙:
1. Header Store Selector에서 전역 store 선택
2. 선택값에 따라 대시보드 조회 API 파라미터 동기화
3. Form 저장은 `all` 불가, 단일 지점 강제
4. API 저장 payload는 `storeKey: st-clair|woodbridge`

---

## 6. 화면-API-DB 동기화 체크포인트

### 6.1 UI 표시명

- All Stores
- St. Clair
- Woodbridge

### 6.2 API storeKey

- `all`
- `st-clair`
- `woodbridge`

### 6.3 DB stores.key

- `st-clair`
- `woodbridge`

### 6.4 저장 금지 규칙

- `all`은 집계 전용이며 `POST /api/v1/sales`에서 허용되지 않는다.

### 6.5 필드 정합성

- `doorDashSales` ↔ `doordash_sales`
- `actualClosingCash` ↔ `actual_closing_cash`
- `tips` ↔ `card_tip`

---

## 7. 페이지/라우트 구성 검증

현재 실제 사용자 페이지 라우트:
- `/` -> Dashboard 단일 페이지

현재 실제 API 라우트:
- `/api/v1/stores`
- `/api/v1/sales`
- `/api/v1/dashboard/summary`
- `/api/v1/dashboard/trends`
- `/api/v1/dashboard/cash-analysis`
- `/api/v1/holidays`
- `/api/v1/holidays/upcoming`
- `/api/v1/holidays/comparison`
- `/api/v1/ai/analyze`

---

## 8. 최종 요약

본 문서는 현재 구현 코드 기준으로 UI/상태/API 연동 정보를 재정리한 동기화 버전이다.

핵심 보장 항목:
- 단일 대시보드 페이지 구조와 실제 컴포넌트 반영
- Zustand + Workflow Context 상태 모델 반영
- Drawer/Form/AI 위젯 실제 동작 반영
- API 호출 경로 및 Store/필드 계약 반영
