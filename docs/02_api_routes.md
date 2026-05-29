# 02_api_routes.md

# Kibo Dashboard - API Routes Design (UI 동기화 반영본)

## 1. API Architecture Overview

Kibo Dashboard는 AI 기반 통합 매출 관리 및 Holiday 분석 시스템이다.

본 문서는 최신 프론트엔드 명세([docs/03_frontend_ui.md](docs/03_frontend_ui.md))와 DB 명세([docs/01_db_schema.md](docs/01_db_schema.md))를 반영해 Frontend ↔ Backend ↔ Database 데이터 계약을 정의한다.

중요한 동기화 규칙:

- 운영 지점은 정확히 2개다: St. Clair, Woodbridge
- API의 `storeKey`는 `st-clair`, `woodbridge`, `all`만 허용한다
- `all`은 대시보드/비교용 집계 범위이며 단일 저장 엔터티를 의미하지 않는다

---

## 2. Backend Architecture

### 권장 구조

```text
Frontend (Next.js)
    ↓
REST API
    ↓
Backend Server (Express / NestJS)
    ↓
PostgreSQL
```

### 권장 기술 스택

| 영역 | 추천 |
|---|---|
| Runtime | Node.js |
| Framework | Express.js 또는 NestJS |
| ORM | Prisma |
| Validation | Zod |
| Authentication | JWT |
| File Upload | Multer |
| Queue | BullMQ |
| AI Integration | OpenAI / Claude API |

---

## 3. API Standards

### Base URL

```text
/api/v1
```

### Response Format

#### Success Response

```json
{
  "success": true,
  "data": {}
}
```

#### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

### Authentication Strategy

모든 보호된 API는 JWT Access Token 기반 인증 사용.

```text
Authorization: Bearer access_token
```

### Naming Convention

- API Request/Response: camelCase
- DB Column: snake_case

### Store 식별 규칙

- 분석/대시보드 API: `storeKey` 허용
- create/update/single 조회 API: `storeId`(UUID) 또는 `storeKey`(서버 내부 변환) 허용
- 허용 `storeKey`:
- `all` (집계 전용)
- `st-clair`
- `woodbridge`

### Store 표시명 규칙

| storeKey | Display Name |
|---|---|
| all | All Stores |
| st-clair | St. Clair |
| woodbridge | Woodbridge |

---

## 4. Authentication APIs

## 4.1 Login

### POST /auth/login

관리자 로그인 API

#### Request

```json
{
  "email": "admin@kibo.com",
  "password": "password123"
}
```

#### Validation Rules

| Field | Rule |
|---|---|
| email | 이메일 형식 |
| password | 최소 8자 |

#### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "admin": {
      "id": "uuid",
      "name": "Mia",
      "email": "admin@kibo.com"
    }
  }
}
```

#### Backend Flow

```text
1. 이메일 조회
2. 비밀번호 검증
3. JWT 생성
4. Refresh Token 생성
5. last_login_at 업데이트
6. 응답 반환
```

---

## 4.2 Refresh Token

### POST /auth/refresh

Access Token 재발급 API

#### Request

```json
{
  "refreshToken": "refresh_token"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token"
  }
}
```

---

## 4.3 Logout

### POST /auth/logout

로그아웃 처리 API

#### Backend Logic

```text
1. Refresh Token 무효화
2. 세션 제거
3. 로그아웃 완료
```

---

## 5. Admin APIs

## 5.1 Invite Admin

### POST /admins/invite

신규 관리자 초대 API

#### Request

```json
{
  "email": "newadmin@kibo.com"
}
```

#### Backend Flow

```text
1. 이메일 중복 확인
2. invitation token 생성
3. admin_invitations 저장
4. 이메일 발송
```

#### Response

```json
{
  "success": true,
  "data": {
    "message": "Invitation sent successfully"
  }
}
```

---

## 5.2 Accept Invitation

### POST /admins/accept-invitation

초대 수락 및 계정 생성 API

#### Request

```json
{
  "token": "invite_token",
  "name": "John",
  "password": "password123"
}
```

#### Backend Flow

```text
1. invitation token 조회
2. 만료 여부 확인
3. 관리자 생성
4. password hash 저장
5. invitation accepted 처리
```

---

## 5.3 Get Admin List

### GET /admins

관리자 목록 조회 API

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mia",
      "email": "admin@kibo.com"
    }
  ]
}
```

---

## 6. Store APIs

## 6.1 Get Stores

### GET /stores

매장 목록 조회

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "key": "st-clair",
      "name": "St. Clair"
    },
    {
      "id": "uuid",
      "key": "woodbridge",
      "name": "Woodbridge"
    }
  ]
}
```

---

## 6.2 Create Store

### POST /stores

매장 생성 API

#### Request

```json
{
  "key": "st-clair",
  "name": "St. Clair",
  "code": "KB-STC"
}
```

#### Validation Rules

| Field | Rule |
|---|---|
| key | `st-clair`, `woodbridge` 같은 URL-safe slug 형식 |
| name | 운영 표시명 |
| code | 내부 관리 코드, 중복 불가 |

---

## 6.3 Update Store

### PATCH /stores/:id

매장 수정 API

#### Request

```json
{
  "name": "St. Clair"
}
```

---

## 7. Sales APIs

## 7.1 Create or Upsert Daily Sales

### POST /sales

일일 매출 입력 API

중요:

- 프론트엔드는 동일 지점+날짜 재저장 시 최신 값으로 갱신하는 UX이므로 서버도 upsert를 지원한다.
- `all`은 집계 전용 값이므로 저장 API에서는 허용하지 않는다.

#### Request

```json
{
  "storeKey": "st-clair",
  "salesDate": "2026-05-09",

  "cardSales": 4500,
  "cashSales": 1200,

  "uberEatsSales": 800,
  "doorDashSales": 600,
  "cashAndCarrySales": 400,

  "tips": 500,
  "actualClosingCash": 1800,

  "note": "Victoria Day weekend"
}
```

#### Validation Rules

| Field | Rule |
|---|---|
| salesDate | 날짜 형식, 미래 날짜 불가 |
| salesDate | 정책상 최소 2020-01-01 |
| 금액 필드 | 음수 불가 |
| storeKey/storeId | 존재하는 Store |
| storeKey | `all` 불가 |

#### Backend Logic

```text
1. 입력값 검증
2. storeKey -> storeId 변환
3. totalSales 계산
4. expectedCash 계산
5. cashDifference 계산
6. sales upsert (store_id + sales_date)
7. audit_logs 생성
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storeId": "uuid",
    "storeKey": "st-clair",
    "salesDate": "2026-05-09",
    "totalSales": 7500,
    "cashDifference": 200,
    "isUpsert": true
  }
}
```

---

## 7.2 Update Sales

### PATCH /sales/:id

매출 수정 API

#### Request

```json
{
  "cashSales": 1400,
  "reason": "Cash recount correction"
}
```

#### 핵심 요구사항

수정 시 반드시:

- 수정 전 값 기록
- 수정 후 값 기록
- 수정자 기록
- 수정 시간 기록
- 수정 사유 기록

#### Backend Flow

```text
1. 기존 데이터 조회
2. 변경 필드 비교
3. 재계산(totalSales, expectedCash, cashDifference)
4. audit_logs 생성
5. sales 업데이트
```

---

## 7.3 Get Sales List

### GET /sales

매출 목록 조회 API

#### Query Params

```text
?storeKey=st-clair
&startDate=2026-05-01
&endDate=2026-05-31
&page=1
&limit=30
&sortBy=salesDate
&sortOrder=desc
```

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "storeKey": "st-clair",
        "salesDate": "2026-05-09",
        "cardSales": 4500,
        "cashSales": 1200,
        "uberEatsSales": 800,
        "doorDashSales": 600,
        "cashAndCarrySales": 400,
        "tips": 500,
        "actualClosingCash": 1800,
        "totalSales": 7500,
        "netSales": 6400,
        "cashDifference": 200
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 30,
      "total": 120
    }
  }
}
```

---

## 7.4 Get Single Sales

### GET /sales/:id

단일 매출 조회 API

---

## 7.5 Delete Sales

### DELETE /sales/:id

매출 삭제 API

권장 정책:

- Hard Delete 대신 Soft Delete 권장

---

## 8. Dashboard APIs

## 8.1 Dashboard Summary

### GET /dashboard/summary

대시보드 KPI 요약 API

#### Query Params

```text
?storeKey=all
&period=daily
&salesMode=gross
```

#### Enum

- `period`: `daily` | `weekly` | `monthly`
- `salesMode`: `gross` | `net`

#### Response

```json
{
  "success": true,
  "data": {
    "storeKey": "all",
    "period": "daily",
    "salesMode": "gross",
    "totalSales": 35000,
    "netSales": 31000,
    "growthRate": 12.4,
    "previousPeriodSales": 28000
  }
}
```

---

## 8.2 Dashboard Trends

### GET /dashboard/trends

매출 추이 그래프 API

#### Query Params

```text
?storeKey=all
&period=weekly
&salesMode=net
```

#### Response

```json
{
  "success": true,
  "data": {
    "labels": ["W1", "W2", "W3", "W4"],
    "datasets": [
      {
        "name": "Sales",
        "type": "line",
        "data": [10000, 12000, 14000, 13000]
      }
    ],
    "periodTotal": 49000
  }
}
```

---

## 8.3 Cash Analysis

### GET /dashboard/cash-analysis

현금 분석 API

#### Query Params

```text
?storeKey=all
&periodDays=14
&windowCount=5
```

#### 기능

- 14일 기준 분석
- 예상 현금 vs 실제 현금
- 차액 분석
- 전 2주 대비 증감률 분석
- 복수 윈도우 캐러셀 데이터 제공

#### Response

```json
{
  "success": true,
  "data": {
    "anchorDate": "2026-05-10",
    "windows": [
      {
        "startDate": "2026-04-27",
        "endDate": "2026-05-10",
        "expectedCash": 12000,
        "actualCash": 11800,
        "difference": -200,
        "differenceRate": -1.6,
        "vsPreviousAmount": 300,
        "vsPreviousRate": 2.6,
        "discrepancyCount": 6,
        "negativeDiscrepancyCount": 2
      }
    ]
  }
}
```

---

## 9. Holiday APIs

## 9.1 Get Holiday List

### GET /holidays

Holiday Master 목록 조회

#### Response

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

---

## 9.2 Get Upcoming Holidays

### GET /holidays/upcoming

다가오는 홀리데이 조회 API

#### Query Params

```text
?withinDays=30
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Victoria Day",
      "nextDate": "2026-05-18"
    }
  ]
}
```

---

## 9.3 Holiday Comparison

### GET /holidays/comparison

Holiday 매출 비교 API

#### Query Params

```text
?holidayId=uuid
&storeKey=all
&range=1y
```

#### Enum

- `range`: `1y` | `3y` | `5y`

#### Backend Flow

```text
1. Holiday 기준 정보 조회
2. 범위 연도 계산
3. 연도별 Sales 집계
4. YoY 계산
5. 차트/테이블 응답 구성
```

#### Response

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
      },
      {
        "year": 2024,
        "date": "2024-05-20",
        "sales": 12900,
        "yoy": null
      }
    ]
  }
}
```

---

## 9.4 Create Holiday

### POST /holidays

Holiday 생성 API

#### Request

```json
{
  "name": "Victoria Day",
  "date": "2026-05-18"
}
```

---

## 10. AI Analysis APIs

## 10.1 Generate AI Analysis

### POST /ai/analyze

AI 매출 인사이트 생성 API

#### Request

```json
{
  "storeKey": "all",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "analysisType": "weekly"
}
```

#### Backend Flow

```text
1. 매출 데이터 집계
2. Holiday 데이터 조회
3. 추세 계산
4. Prompt 생성
5. GPT/Claude 요청
6. 응답 저장
7. 결과 반환
```

#### Response

```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "summary": "이번 주 St. Clair 및 Woodbridge 매출은 지난주 대비 12.5% 증가했습니다.",
    "generatedAt": "2026-05-29T10:20:30Z"
  }
}
```

---

## 10.2 Get AI Reports

### GET /ai/reports

AI 분석 기록 조회 API

#### Query Params

```text
?storeKey=all
&page=1
&limit=20
```

---

## 11. Audit Log APIs

## 11.1 Get Audit Logs

### GET /audit-logs

수정 이력 조회 API

#### Query Params

```text
?tableName=sales
&recordId=uuid
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "fieldName": "cash_sales",
      "oldValue": "500",
      "newValue": "650",
      "changedBy": "Mia",
      "reason": "Cash recount",
      "createdAt": "2026-05-09T10:00:00Z"
    }
  ]
}
```

---

## 12. Bulk Upload APIs

## 12.1 Upload Sales Excel

### POST /bulk-upload/sales

엑셀 업로드 API

#### Content Type

```text
multipart/form-data
```

#### Backend Flow

```text
1. 파일 업로드
2. Excel Parsing
3. Row Validation
4. Sales upsert
5. 실패 데이터 정리
6. 업로드 결과 저장
```

#### Response

```json
{
  "success": true,
  "data": {
    "totalRows": 120,
    "successRows": 110,
    "failedRows": 10
  }
}
```

---

## 12.2 Get Upload Histories

### GET /bulk-upload/histories

업로드 기록 조회 API

---

## 13. Weather APIs (Future Extension)

## 13.1 Get Weather Data

### GET /weather

날씨 데이터 조회 API

---

## 14. Middleware Design

### Required Middlewares

#### Authentication Middleware

```text
verifyAccessToken
```

#### Validation Middleware

```text
zodValidationMiddleware
```

#### Audit Middleware

```text
auditMiddleware
```

#### Error Middleware

```text
globalErrorHandler
```

---

## 15. API Security Considerations

### 필수 보안 요소

#### 인증

- JWT 인증
- Refresh Token Rotation
- Secure Cookie 권장

#### 데이터 보호

- SQL Injection 방지
- Input Validation
- Rate Limiting

#### 파일 업로드 보안

- 파일 타입 검증
- 최대 용량 제한
- 악성 파일 검사

---

## 16. Recommended Backend Folder Structure

```text
src/
 ├── modules/
 │    ├── auth/
 │    ├── admins/
 │    ├── stores/
 │    ├── sales/
 │    ├── dashboard/
 │    ├── holidays/
 │    ├── ai/
 │    ├── audit/
 │    └── bulk-upload/
 │
 ├── middlewares/
 ├── services/
 ├── database/
 ├── utils/
 └── jobs/
```

---

## 17. Suggested API Development Priority

### Phase 1

- Authentication APIs
- Store APIs
- Sales CRUD/Upsert APIs
- Dashboard Summary/Trends/Cash APIs

### Phase 2

- Holiday APIs
- Audit APIs
- Bulk Upload APIs

### Phase 3

- AI Analysis APIs
- Weather APIs
- Predictive Analytics APIs

---

## 18. Backward Compatibility Notes

이전 계약과의 호환을 위해 서버에서 다음 alias를 임시 허용할 수 있다:

- `actualCashClosing` -> `actualClosingCash` (deprecated)
- `doordashSales` -> `doorDashSales` (preferred: `doorDashSales`)
- `kibo-north` -> `st-clair` (deprecated alias)
- `kibo-south` -> `woodbridge` (deprecated alias)

권장:

- 1개 릴리스 기간 경고 로그 출력 후 alias 제거

---

## 19. Final API Summary

Kibo Dashboard API 구조는 다음 핵심 목적을 기반으로 설계되었다.

- St. Clair / Woodbridge 매출 데이터 관리
- Holiday 기반 비교 분석
- 현금 흐름 분석
- 관리자 수정 이력 추적
- AI 분석 확장성 확보
- 향후 외부 API 연동 가능 구조 유지

본 문서는 최신 UI 및 DB 문서와 동기화된 API 중심 설계 문서이다.
