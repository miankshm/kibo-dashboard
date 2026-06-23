# 02_api_routes.md

# Kibo Dashboard - API Routes Design (실구현 Reverse-Sync 반영본)

## 1. API Architecture Overview

본 문서는 현재 Next.js Route Handler 구현(`app/api/v1/**/route.ts`)을 기준으로 역동기화한 API 문서다.

중요 규칙:
- Base URL: `/api/v1`
- Store Key 허용값: `all`, `st-clair`, `woodbridge`
- 저장 API(`POST /sales`)에서는 `all` 허용 안 함

---

## 2. Backend Architecture (Actual)

구현 구조:

```text
Frontend (Next.js App Router)
    ↓ fetch
/api/v1/* Route Handlers (NextResponse)
    ↓
lib/db-queries.ts
    ↓
Drizzle ORM + PostgreSQL
```

현재 구현에는 별도 auth middleware/JWT 보호 로직이 없다.

---

## 3. API Standards

### Base URL

```text
/api/v1
```

### Success Envelope

```json
{
  "success": true,
  "data": {}
}
```

### Error Envelope

```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

`errors`는 일부 400 검증 에러에서만 포함된다.

---

## 4. Implemented Endpoint Matrix

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/stores` | Store 목록 조회 |
| GET | `/api/v1/sales` | Sales 목록/페이지네이션 조회 |
| POST | `/api/v1/sales` | Daily Sales upsert 저장 |
| GET | `/api/v1/dashboard/summary` | KPI 요약 |
| GET | `/api/v1/dashboard/trends` | 추이 차트 데이터 |
| GET | `/api/v1/dashboard/cash-analysis` | 현금 분석 윈도우 데이터 |
| GET | `/api/v1/holidays` | Holiday 마스터 목록 |
| GET | `/api/v1/holidays/upcoming` | N일 이내 다가오는 Holiday |
| GET | `/api/v1/holidays/comparison` | Holiday 연도 비교 |
| POST | `/api/v1/ai/analyze` | AI 분석 리포트 생성 |

현재 코드에 없는 엔드포인트(auth/admin/audit/bulk-upload 등)는 본 문서에서 제거했다.

---

## 5. Route Details

## 5.1 Stores API

### GET /stores

Store 목록을 반환한다.

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "key": "st-clair",
      "name": "St. Clair",
      "code": "KB-STC"
    }
  ]
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch stores" }`

비즈니스 로직:
- 내부에서 `st-clair`, `woodbridge` store row 자동 보정 생성 시도 후 반환.

---

## 5.2 Sales APIs

### GET /sales

Query:
- `storeKey` (optional: `all|st-clair|woodbridge`, invalid 값은 무시)
- `startDate` (optional, `YYYY-MM-DD`)
- `endDate` (optional, `YYYY-MM-DD`)
- `page` (optional, default `1`)
- `limit` (optional, default `30`)
- `sortOrder` (optional, `asc|desc`, default `desc`)

Response `200`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "storeKey": "st-clair",
        "salesDate": "2026-06-12",
        "cardSales": 0,
        "cashSales": 0,
        "uberEatsSales": 0,
        "doorDashSales": 0,
        "cashAndCarrySales": 0,
        "tips": 0,
        "actualClosingCash": 0,
        "totalSales": 0,
        "netSales": 0,
        "expectedCash": 0,
        "cashDifference": 0,
        "note": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 30,
      "total": 1
    }
  }
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch sales" }`

### POST /sales

Body:

```json
{
  "storeKey": "st-clair",
  "salesDate": "2026-06-12",
  "cardSales": 4500,
  "cashSales": 1200,
  "uberEatsSales": 800,
  "doorDashSales": 600,
  "cashAndCarrySales": 400,
  "tips": 500,
  "actualClosingCash": 1800,
  "note": "optional"
}
```

검증:
- `storeKey`는 `st-clair|woodbridge`만 허용 (`all` 불가)
- `salesDate` 필수
- 금액 값은 route 레벨에서 Number 캐스팅 후 저장

Validation Error `400` 예시:

```json
{
  "success": false,
  "message": "Invalid storeKey",
  "errors": [
    {
      "field": "storeKey",
      "message": "storeKey must be st-clair or woodbridge"
    }
  ]
}
```

Success `200`:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storeId": "uuid",
    "storeKey": "st-clair",
    "salesDate": "2026-06-12",
    "cardSales": 4500,
    "cashSales": 1200,
    "uberEatsSales": 800,
    "doorDashSales": 600,
    "cashAndCarrySales": 400,
    "tips": 500,
    "actualClosingCash": 1800,
    "totalSales": 7500,
    "netSales": 7226,
    "expectedCash": 700,
    "cashDifference": 1100,
    "isUpsert": true
  }
}
```

Error:
- `500`: `{ success: false, message: "Failed to save sale" }`

---

## 5.3 Dashboard APIs

### GET /dashboard/summary

Query:
- `storeKey`: `all|st-clair|woodbridge` (default `all`)
- `period`: `daily|weekly|monthly` (default `daily`)
- `salesMode`: `gross|net` (default `gross`)

Response `200`:

```json
{
  "success": true,
  "data": {
    "storeKey": "all",
    "period": "daily",
    "salesMode": "gross",
    "totalSales": 35000,
    "netSales": 29750,
    "growthRate": 12.4,
    "previousPeriodSales": 28000
  }
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch dashboard summary" }`

### GET /dashboard/trends

Query:
- `storeKey`: `all|st-clair|woodbridge` (default `all`)
- `period`: `daily|weekly|monthly` (default `daily`)
- `salesMode`: `gross|net` (default `gross`)
- `language`: `ko|en` (default `ko`)

Response `200`:

```json
{
  "success": true,
  "data": {
    "labels": ["W1", "W2", "W3", "W4"],
    "datasets": [
      {
        "name": "Gross Sales",
        "type": "line",
        "data": [10000, 12000, 14000, 13000]
      }
    ],
    "periodTotal": 49000
  }
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch dashboard trends" }`

### GET /dashboard/cash-analysis

Query:
- `storeKey`: `all|st-clair|woodbridge` (default `all`)
- `periodDays`: number (default `14`)
- `windowCount`: number (default `5`)

Response `200`:

```json
{
  "success": true,
  "data": {
    "anchorDate": "2026-06-12",
    "windows": [
      {
        "startDate": "2026-05-30",
        "endDate": "2026-06-12",
        "expectedCash": 12000,
        "actualCash": 11800,
        "difference": -200,
        "differenceRate": -1.6,
        "vsPreviousAmount": 300,
        "vsPreviousRate": 2.6,
        "discrepancyCount": 6,
        "negativeDiscrepancyCount": 2,
        "details": [
          {
            "date": "2026-06-12",
            "expected": 900,
            "actual": 850,
            "difference": -50
          }
        ]
      }
    ]
  }
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch cash analysis" }`

---

## 5.4 Holiday APIs

### GET /holidays

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Victoria Day",
      "month": 5,
      "day": 19
    }
  ]
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch holidays" }`

### GET /holidays/upcoming

Query:
- `withinDays`: number (default `30`)

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Victoria Day",
      "month": 5,
      "day": 19,
      "nextDate": "2026-05-18"
    }
  ]
}
```

Error:
- `500`: `{ success: false, message: "Failed to fetch upcoming holidays" }`

### GET /holidays/comparison

Query:
- `holidayId`: string (required)
- `storeKey`: `all|st-clair|woodbridge` (default `all`)
- `range`: `1y|3y|5y` (default `1y`)

Validation/Error:
- `400`: `holidayId` 누락 시
- `404`: holiday 미존재 시
- `500`: 조회 실패 시

Success `200`:

```json
{
  "success": true,
  "data": {
    "holiday": {
      "id": "uuid",
      "name": "Victoria Day",
      "month": 5,
      "day": 19
    },
    "storeKey": "all",
    "range": "1y",
    "chart": {
      "labels": ["2025"],
      "data": [14500]
    },
    "history": [
      {
        "year": 2025,
        "date": "2025-05-19",
        "sales": 14500,
        "yoy": 12.4
      }
    ]
  }
}
```

---

## 5.5 AI Analysis API

### POST /ai/analyze

Body:
- `storeKey` (optional, default `all`)
- `startDate` (optional, default 오늘)
- `endDate` (optional, default 오늘)
- `analysisType` (optional, default `weekly`)
  - `weekly|monthly|holiday|cash_flow`

Response `200`:

```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "summary": "...",
    "generatedAt": "2026-06-12T09:00:00.000Z"
  }
}
```

Error:
- `500`: `{ success: false, message: "Failed to generate AI report" }`

참고:
- 내부 저장 `generatedByModel`은 현재 `GPT-5.4` 문자열로 기록되며 응답에는 노출되지 않는다.

---

## 6. Business Logic Notes (Implemented)

- Sales upsert는 (`store_id`, `sales_date`) 충돌 업데이트 방식.
- `expectedCashAmount = cashSales - tips`.
- `netSales = cardSales + cashSales + cashAndCarrySales + (uberEatsSales * 0.77) + (doorDashSales * 0.85)`.
- Dashboard Summary의 `growthRate`는 이전 동일 길이 기간 대비 증감률.
- Trends:
  - `daily`: 최근 7일
  - `weekly`: 최근 4주
  - `monthly`: 최근 6개월
- Holiday Comparison은 `events.event_date` 기준으로 연도별 sales 집계 후 YoY 계산.
- AI Analyze는 선택 기간 매출 집계를 텍스트 리포트로 저장/반환.

---

## 7. Status Code Coverage (Actual)

- `200`: 정상 응답
- `400`: `POST /sales` 검증 실패, `GET /holidays/comparison` 필수 파라미터 누락
- `404`: `GET /holidays/comparison` 대상 holiday 없음
- `500`: 모든 route의 공통 예외 처리

---

## 8. Final API Summary

현재 API는 대시보드 운영에 필요한 최소 집합(Stores/Sales/Dashboard/Holidays/AI)만 구현되어 있다.

문서-코드 동기화 핵심:
- 실제 존재 엔드포인트만 유지
- 실제 메서드/쿼리/바디/응답 구조 반영
- 실제 에러 상태 코드와 기본값 처리 반영
