# 01_db_schema.md

# Kibo Dashboard - Database Schema Design (UI 동기화 반영본)

## 1. Database Design Overview

Kibo Dashboard는 AI 기반 통합 매출 관리 및 홀리데이 분석 시스템이다.

본 문서는 최신 프론트엔드 명세([docs/03_frontend_ui.md](docs/03_frontend_ui.md))와 API 계약([docs/02_api_routes.md](docs/02_api_routes.md))을 기준으로 DB 설계를 정합성 있게 재정의한다.

핵심 목표:

- 다중 관리자 계정 관리
- 다중 매장(Store) 관리
- 일일 매출 입력/조회/수정 추적
- Holiday 기반 연도 비교 분석
- Audit Log 기반 이력 추적
- Bulk Upload 지원
- AI 분석 및 Weather 확장성 확보

중요한 동기화 규칙:

- 운영 지점은 정확히 2개다: St. Clair, Woodbridge
- 프론트/API의 `storeKey`는 `st-clair`, `woodbridge`, `all`만 허용한다
- `all`은 집계 전용 가상 범위이며 DB의 `stores` 테이블에는 저장하지 않는다
- 화면 표시명(Display Name)은 St. Clair, Woodbridge로 고정한다

---

## 2. Database Architecture

### 권장 데이터베이스

- PostgreSQL

### 권장 ORM

- Prisma ORM
- TypeORM

---

## 3. Naming and Contract Rules

### 3.1. 네이밍 규칙

- DB 컬럼: snake_case
- API 필드: camelCase
- 프론트엔드 폼/상태: camelCase

### 3.2. 핵심 필드 정합성 규칙

- 프론트/API의 `actualClosingCash`는 DB의 `actual_closing_cash`로 매핑한다.
- 프론트/API의 `doorDashSales`는 DB의 `doordash_sales`로 매핑한다.
- 프론트/API의 `tips`는 DB의 `card_tip`으로 매핑한다.
- 프론트/API의 `storeKey`(`st-clair`, `woodbridge`)는 DB `stores.key`로 관리한다.
- 내부 조인 및 무결성은 `stores.id`(UUID) 기준으로 처리한다.

### 3.3. 이전 문서 대비 변경 포인트

- `sales.actual_cash_closing` 명칭은 `actual_closing_cash`로 표준화
- `stores.key`(슬러그) 필드 유지
- 지점 키를 `kibo-north`, `kibo-south`에서 `st-clair`, `woodbridge`로 변경
- 금액 필드 음수 방지 CHECK 제약 명시
- 프론트 입력 계약 기준 매핑 표 추가

---

## 4. Core Entity Relationship

```text
Admins
 ├── AdminInvitations
 ├── AuditLogs
 └── Sales (created_by / updated_by)

Stores
 └── Sales

EventMasters
 └── Events

Events
 └── Sales (날짜 기준 분석 연결)

Sales
 ├── AuditLogs
 └── AIAnalysisReports
```

---

## 5. Table Definitions

## 5.1 admins

관리자 계정 테이블

### 목적

- 로그인/인증 처리
- 관리자 식별
- 수정 이력 연결

### Schema

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    is_active BOOLEAN DEFAULT true,

    invited_by UUID REFERENCES admins(id),

    last_login_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5.2 admin_invitations

관리자 이메일 초대 관리

### Schema

```sql
CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL,

    invitation_token TEXT UNIQUE NOT NULL,

    invited_by UUID REFERENCES admins(id),

    expires_at TIMESTAMP NOT NULL,

    accepted_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5.3 stores

매장 정보 테이블

### 목적

- 다중 지점 관리
- 대시보드 필터 기준
- 프론트 `storeKey`와 내부 UUID 연결

### Schema

```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    key VARCHAR(50) UNIQUE NOT NULL,

    name VARCHAR(100) NOT NULL,

    code VARCHAR(50) UNIQUE,

    address TEXT,

    phone VARCHAR(30),

    timezone VARCHAR(50) DEFAULT 'America/Toronto',

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
);
```

### key / name 예시 데이터

```sql
INSERT INTO stores (key, name, code)
VALUES
  ('st-clair', 'St. Clair', 'KB-STC'),
  ('woodbridge', 'Woodbridge', 'KB-WDB');
```

참고:

- `all`은 집계 전용 가상 범위이며 `stores` 테이블에는 저장하지 않는다.
- 프론트의 드롭다운 표시명은 `name` 기준으로 구성한다.

---

## 5.4 sales

핵심 매출 데이터 테이블

### 목적

- 일일 매출 저장
- 현금 분석
- Holiday 분석
- AI 분석 데이터 제공

### Schema

```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    store_id UUID NOT NULL REFERENCES stores(id),

    sales_date DATE NOT NULL,

    dine_in_sales NUMERIC(12,2) DEFAULT 0,

    card_sales NUMERIC(12,2) DEFAULT 0,

    card_tip NUMERIC(12,2) DEFAULT 0,

    cash_sales NUMERIC(12,2) DEFAULT 0,

    uber_eats_sales NUMERIC(12,2) DEFAULT 0,

    doordash_sales NUMERIC(12,2) DEFAULT 0,

    cash_and_carry_sales NUMERIC(12,2) DEFAULT 0,

    actual_closing_cash NUMERIC(12,2) DEFAULT 0,

    expected_cash_amount NUMERIC(12,2) DEFAULT 0,

    cash_difference NUMERIC(12,2) DEFAULT 0,

    total_sales NUMERIC(12,2) DEFAULT 0,

    net_sales NUMERIC(12,2) DEFAULT 0,

    note TEXT,

    created_by UUID REFERENCES admins(id),

    updated_by UUID REFERENCES admins(id),

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, sales_date),

    CHECK (card_sales >= 0),
    CHECK (card_tip >= 0),
    CHECK (cash_sales >= 0),
    CHECK (uber_eats_sales >= 0),
    CHECK (doordash_sales >= 0),
    CHECK (cash_and_carry_sales >= 0),
    CHECK (actual_closing_cash >= 0),
    CHECK (expected_cash_amount >= 0)
);
```

### 핵심 계산 로직

```text
total_sales = card_sales + cash_sales + uber_eats_sales + doordash_sales + cash_and_carry_sales
net_sales = total_sales - (정책 기반 공제값)
expected_cash_amount = cash_sales (또는 운영정책 기반 계산식)
cash_difference = actual_closing_cash - expected_cash_amount
```

---

## 5.5 event_masters

Holiday 이름 기준 그룹 테이블

### Schema

```sql
CREATE TABLE event_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL,

    category VARCHAR(50),

    description TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5.6 events

연도별 Holiday 날짜 테이블

### Schema

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_master_id UUID REFERENCES event_masters(id),

    event_date DATE NOT NULL,

    year INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(event_master_id, year)
);
```

---

## 5.7 audit_logs

수정 이력 추적 테이블

### Schema

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    table_name VARCHAR(100) NOT NULL,

    record_id UUID NOT NULL,

    field_name VARCHAR(100) NOT NULL,

    old_value TEXT,

    new_value TEXT,

    changed_by UUID REFERENCES admins(id),

    reason TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

필수 기록:

- 수정 전 값
- 수정 후 값
- 수정자
- 수정 시간
- 수정 사유

---

## 5.8 bulk_upload_histories

엑셀 업로드 기록 테이블

### Schema

```sql
CREATE TABLE bulk_upload_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    uploaded_by UUID REFERENCES admins(id),

    file_name TEXT,

    total_rows INTEGER,

    success_rows INTEGER,

    failed_rows INTEGER,

    upload_status VARCHAR(50),

    error_log JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5.9 ai_analysis_reports

AI 분석 결과 저장 테이블

### Schema

```sql
CREATE TABLE ai_analysis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    store_id UUID REFERENCES stores(id),

    period_start DATE,

    period_end DATE,

    report_type VARCHAR(50),

    summary TEXT,

    insights JSONB,

    generated_by_model VARCHAR(50),

    created_by UUID REFERENCES admins(id),

    created_at TIMESTAMP DEFAULT NOW()
);
```

`report_type` 예시:

- WEEKLY
- MONTHLY
- HOLIDAY
- CASH_FLOW

참고:

- `store_id`가 NULL이면 전체 집계(`all`) 기반 리포트로 해석할 수 있다.
- `store_id`가 존재하면 St. Clair 또는 Woodbridge 단일 지점 리포트다.

---

## 5.10 weather_snapshots (Future Extension)

날씨-매출 상관 분석 확장 대비

### Schema

```sql
CREATE TABLE weather_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    snapshot_date DATE,

    temperature NUMERIC(5,2),

    weather_condition VARCHAR(100),

    precipitation NUMERIC(5,2),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Frontend/API/DB Field Mapping

| Frontend Field | API Field | DB Column |
|---|---|---|
| storeId (선택값) | storeKey 또는 storeId | stores.key / stores.id |
| date | salesDate | sales_date |
| cardSales | cardSales | card_sales |
| cashSales | cashSales | cash_sales |
| uberEatsSales | uberEatsSales | uber_eats_sales |
| doorDashSales | doorDashSales | doordash_sales |
| cashAndCarrySales | cashAndCarrySales | cash_and_carry_sales |
| tips | tips | card_tip |
| actualClosingCash | actualClosingCash | actual_closing_cash |

### Store Mapping 규칙

| UI Label | API storeKey | DB stores.key |
|---|---|---|
| All Stores | all | 저장 안 함 |
| St. Clair | st-clair | st-clair |
| Woodbridge | woodbridge | woodbridge |

정책 메모:

- 프론트의 `tips`는 현재 기준안에서 `card_tip`으로 저장한다.
- 프론트의 전체 보기 값 `all`은 DB에 저장되지 않으며, API/서비스 계층에서 집계 처리한다.

---

## 7. Recommended Indexes

```sql
CREATE INDEX idx_stores_key
ON stores(key);

CREATE INDEX idx_sales_store_date
ON sales(store_id, sales_date);

CREATE INDEX idx_sales_date
ON sales(sales_date);

CREATE INDEX idx_events_master_date
ON events(event_master_id, event_date);

CREATE INDEX idx_audit_logs_record
ON audit_logs(record_id);
```

---

## 8. Data Flow Design

### 8.1 매출 입력 흐름

```text
관리자 입력
→ Validation
→ stores.key/storeId 해석
→ Sales upsert(UNIQUE store_id + sales_date)
→ Audit Log 생성
→ Dashboard 집계 반영
→ AI 분석 대상 데이터 준비
```

### 8.2 Holiday 분석 흐름

```text
Holiday 선택
→ EventMaster 조회
→ 연도별 Event 조회
→ 해당 일자 Sales 집계
→ 연도별 비교 데이터 생성
→ Dashboard 시각화
```

### 8.3 현금 분석 흐름

```text
기간(14일) 선택
→ sales.cash_sales, sales.actual_closing_cash 집계
→ expected_cash_amount, cash_difference 계산
→ 전 기간 대비 증감 계산
```

---

## 9. Security Considerations

- JWT 인증 권장
- bcrypt password hashing 권장
- SQL Injection 방지
- 관리자 인증 미들웨어 적용
- Audit Logging 필수

---

## 10. Scalability Considerations

확장 가능 요소:

- Weather API
- POS 연동
- 모바일 앱
- AI 매출 예측
- 실시간 Dashboard
- PDF Export
- 다국어 지원

---

## 11. Migration Notes

기존 스키마가 이전 store key인 `kibo-north`, `kibo-south`를 사용 중이면 다음 순서로 마이그레이션한다:

```sql
UPDATE stores
SET key = 'st-clair',
    name = 'St. Clair'
WHERE key = 'kibo-north';

UPDATE stores
SET key = 'woodbridge',
    name = 'Woodbridge'
WHERE key = 'kibo-south';
```

기존 스키마에 `actual_cash_closing` 컬럼을 사용 중이면 다음 중 하나를 선택:

- 권장: `actual_closing_cash`로 컬럼 rename
- 대안: `actual_cash_closing` 유지 + API/ORM 레벨 alias 매핑

중요:

- 문서/코드/DB 중 하나라도 지점 키 또는 현금 컬럼 명칭이 다르면 대시보드 집계, 폼 저장, Holiday 비교에서 장애가 발생할 수 있다.

---

## 12. Final Database Summary

본 DB 설계는 최신 UI/UX 문서와 API 계약을 함께 반영한 기준안이다.

핵심 보장 항목:

- St. Clair / Woodbridge 2개 지점 기준 매출 데이터 안정 저장
- Holiday 중심 비교 분석
- 현금 흐름 추적
- 관리자 수정 이력 추적
- AI 분석 확장성 확보
- 외부 API 연동 가능 구조 유지
