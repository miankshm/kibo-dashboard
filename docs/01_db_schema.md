# 01_db_schema.md

# Kibo Dashboard - Database Schema Design (실구현 Reverse-Sync 반영본)

## 1. Database Design Overview

본 문서는 현재 코드 구현을 기준으로 DB 스키마를 역동기화한 기준 문서다.

Ground Truth 소스:
- `lib/schema.ts` (Drizzle 테이블 정의)
- `lib/db.ts` (DB 연결)
- `lib/db-queries.ts` (실제 계산/조회/업서트 로직)
- `drizzle.config.ts` (스키마 경로 및 마이그레이션 설정)

운영 Store 규칙:
- Persisted Store Key: `st-clair`, `woodbridge`
- Aggregate View Key: `all` (DB `stores`에는 저장되지 않음)

---

## 2. Database Architecture

### 실제 사용 데이터베이스/ORM

- Database: PostgreSQL
- ORM/Query Builder: Drizzle ORM (`drizzle-orm` + `postgres`)
- Schema Source: `lib/schema.ts`
- Drizzle Config: `drizzle.config.ts`

### 연결 방식

- `DATABASE_URL` 환경변수 필수
- `lib/db.ts`에서 `postgres()` + `drizzle(sql, { schema })` 사용

---

## 3. Naming and Contract Rules

### 3.1 네이밍 규칙

- DB 컬럼: snake_case
- TypeScript/Frontend/API 필드: camelCase

### 3.2 핵심 필드 매핑 규칙

- `doorDashSales` ↔ `doordash_sales`
- `tips` ↔ `card_tip`
- `actualClosingCash` ↔ `actual_closing_cash`
- `storeKey`(`st-clair`/`woodbridge`) ↔ `stores.key`

### 3.3 Store 규칙

- `all`은 집계 전용 값이며 실제 테이블 키가 아니다.
- 저장(`sales`)은 반드시 `st-clair` 또는 `woodbridge`로 수행된다.

---

## 4. Core Entity Relationship

```text
admins
 ├── admin_invitations.invited_by
 ├── sales.created_by
 ├── sales.updated_by
 ├── audit_logs.changed_by
 ├── bulk_upload_histories.uploaded_by
 └── ai_analysis_reports.created_by

stores
 ├── sales.store_id
 └── ai_analysis_reports.store_id (nullable)

event_masters
 └── events.event_master_id

events
 └── sales 와 event_date 기반 분석 조인 (쿼리 레벨)
```

---

## 5. Table Definitions (Actual)

## 5.1 admins

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| name | varchar(100) | NOT NULL | - | - |
| email | varchar(255) | NOT NULL | - | UNIQUE |
| password_hash | text | NOT NULL | - | - |
| is_active | boolean | NULL | true | - |
| invited_by | uuid | NULL | - | FK -> admins.id |
| last_login_at | timestamp | NULL | - | - |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |

## 5.2 admin_invitations

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| email | varchar(255) | NOT NULL | - | - |
| invitation_token | text | NOT NULL | - | UNIQUE |
| invited_by | uuid | NULL | - | FK -> admins.id |
| expires_at | timestamp | NOT NULL | - | - |
| accepted_at | timestamp | NULL | - | - |
| created_at | timestamp | NULL | now() | - |

## 5.3 stores

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| key | varchar(50) | NOT NULL | - | UNIQUE |
| name | varchar(100) | NOT NULL | - | - |
| code | varchar(50) | NULL | - | UNIQUE |
| address | text | NULL | - | - |
| phone | varchar(30) | NULL | - | - |
| timezone | varchar(50) | NULL | America/Toronto | - |
| is_active | boolean | NULL | true | - |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |

Indexes:
- `idx_stores_key` on (`key`)

## 5.4 sales

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| store_id | uuid | NOT NULL | - | FK -> stores.id |
| sales_date | date | NOT NULL | - | - |
| dine_in_sales | numeric(12,2) | NULL | 0 | - |
| card_sales | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| card_tip | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| cash_sales | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| uber_eats_sales | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| doordash_sales | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| cash_and_carry_sales | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| actual_closing_cash | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| expected_cash_amount | numeric(12,2) | NULL | 0 | CHECK >= 0 |
| cash_difference | numeric(12,2) | NULL | 0 | - |
| total_sales | numeric(12,2) | NULL | 0 | - |
| net_sales | numeric(12,2) | NULL | 0 | - |
| note | text | NULL | - | - |
| created_by | uuid | NULL | - | FK -> admins.id |
| updated_by | uuid | NULL | - | FK -> admins.id |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |

Indexes/Unique:
- UNIQUE `sales_store_id_sales_date_key` on (`store_id`, `sales_date`)
- `idx_sales_store_date` on (`store_id`, `sales_date`)
- `idx_sales_date` on (`sales_date`)

## 5.5 event_masters

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| name | varchar(100) | NOT NULL | - | UNIQUE |
| category | varchar(50) | NULL | - | - |
| description | text | NULL | - | - |
| created_at | timestamp | NULL | now() | - |

## 5.6 events

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| event_master_id | uuid | NULL | - | FK -> event_masters.id |
| event_date | date | NOT NULL | - | - |
| year | integer | NOT NULL | - | - |
| created_at | timestamp | NULL | now() | - |

Indexes/Unique:
- UNIQUE `events_event_master_id_year_key` on (`event_master_id`, `year`)
- `idx_events_master_date` on (`event_master_id`, `event_date`)

## 5.7 audit_logs

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| table_name | varchar(100) | NOT NULL | - | - |
| record_id | uuid | NOT NULL | - | - |
| field_name | varchar(100) | NOT NULL | - | - |
| old_value | text | NULL | - | - |
| new_value | text | NULL | - | - |
| changed_by | uuid | NULL | - | FK -> admins.id |
| reason | text | NULL | - | - |
| created_at | timestamp | NULL | now() | - |

Indexes:
- `idx_audit_logs_record` on (`record_id`)

## 5.8 bulk_upload_histories

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| uploaded_by | uuid | NULL | - | FK -> admins.id |
| file_name | text | NULL | - | - |
| total_rows | integer | NULL | - | - |
| success_rows | integer | NULL | - | - |
| failed_rows | integer | NULL | - | - |
| upload_status | varchar(50) | NULL | - | - |
| error_log | jsonb | NULL | - | - |
| created_at | timestamp | NULL | now() | - |

## 5.9 ai_analysis_reports

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| store_id | uuid | NULL | - | FK -> stores.id |
| period_start | date | NULL | - | - |
| period_end | date | NULL | - | - |
| report_type | varchar(50) | NULL | - | - |
| summary | text | NULL | - | - |
| insights | jsonb | NULL | - | - |
| generated_by_model | varchar(50) | NULL | - | - |
| created_by | uuid | NULL | - | FK -> admins.id |
| created_at | timestamp | NULL | now() | - |

## 5.10 weather_snapshots

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| snapshot_date | date | NULL | - | - |
| temperature | numeric(5,2) | NULL | - | - |
| weather_condition | varchar(100) | NULL | - | - |
| precipitation | numeric(5,2) | NULL | - | - |
| created_at | timestamp | NULL | now() | - |

---

## 6. Runtime Data Rules (lib/db-queries.ts)

### 6.1 Sales 계산 로직

- `totalSales = cardSales + cashSales + uberEatsSales + doorDashSales + cashAndCarrySales`
- `expectedCashAmount = cashSales - tips`
- `cashDifference = actualClosingCash - expectedCashAmount`
- `netSales = cardSales + cashSales + cashAndCarrySales + (uberEatsSales * 0.77) + (doorDashSales * 0.85)`

### 6.2 Sales 저장 로직

- `sales`는 (`store_id`, `sales_date`) 기준 upsert
- 충돌 시 동일 날짜 레코드 업데이트

### 6.3 Store 보정 로직

- `st-clair`, `woodbridge` store row가 없으면 자동 생성 시도

---

## 7. Frontend/API/DB Field Mapping

| Frontend/API Field | DB Column |
|---|---|
| storeKey | stores.key |
| salesDate | sales.sales_date |
| cardSales | sales.card_sales |
| cashSales | sales.cash_sales |
| uberEatsSales | sales.uber_eats_sales |
| doorDashSales | sales.doordash_sales |
| cashAndCarrySales | sales.cash_and_carry_sales |
| tips | sales.card_tip |
| actualClosingCash | sales.actual_closing_cash |
| expectedCash | sales.expected_cash_amount |
| cashDifference | sales.cash_difference |

Store 매핑:
- UI/API `all` -> 집계 전용, DB 저장 없음
- UI/API `st-clair` -> `stores.key = st-clair`
- UI/API `woodbridge` -> `stores.key = woodbridge`

---

## 8. Final Database Summary

현재 구현 기준에서 DB 스키마는 Drizzle 정의와 일치하며, 문서상 테이블/컬럼/제약/인덱스/관계는 모두 `lib/schema.ts` 기준으로 동기화되었다.

핵심 보장 항목:
- 10개 테이블 정의 일치
- Store Key 정책(`all` 비저장, 2개 지점 저장) 일치
- Sales 계산/업서트 로직 일치
- API/Frontend 필드 매핑 일치
