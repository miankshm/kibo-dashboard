# 01_db_schema.md

# Kibo Dashboard - Database Schema Design

## 1. Database Design Overview

Kibo Dashboard는 AI 기반 통합 매출 관리 및 홀리데이 분석 시스템이다.

본 문서는 사용자가 제공한 요구사항만을 100% 기반으로 작성된 DB 설계 문서이며,
다음 핵심 기능을 지원하기 위한 데이터 구조를 정의한다.

- 다중 관리자 계정 관리
- 다중 매장(Store) 관리
- 일일 매출 입력 및 조회
- Holiday 기반 매출 비교 분석
- Audit Log 기반 수정 이력 추적
- Bulk Upload 지원
- 향후 AI 분석 및 Weather API 확장성 확보

---

# 2. Database Architecture

## 권장 데이터베이스

- PostgreSQL

## 권장 ORM

- Prisma ORM
또는
- TypeORM

---

# 3. Core Entity Relationship

```text
Admins
 ├── AdminInvitations
 ├── AuditLogs
 └── Sales

Stores
 └── Sales

EventMasters
 └── Events

Events
 └── Sales (날짜 기준 연결)

Sales
 ├── AuditLogs
 └── AIAnalysisReports
```

---

# 4. Table Definitions

# 4.1 admins

관리자 계정 테이블

## 목적

- 관리자 로그인
- 인증 처리
- 관리자 식별
- 수정 이력 기록 연결

## Schema

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

## 주요 필드 설명

| Field | Description |
|---|---|
| id | 관리자 고유 ID |
| name | 관리자 이름 |
| email | 로그인 이메일 |
| password_hash | 암호화된 비밀번호 |
| invited_by | 초대한 관리자 |
| is_active | 계정 활성화 여부 |

---

# 4.2 admin_invitations

관리자 이메일 초대 관리 테이블

## 목적

- 이메일 초대 링크 관리
- 신규 관리자 가입 처리
- 초대 만료 관리

## Schema

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

## 핵심 로직

```text
기존 관리자
→ 이메일 초대 발송
→ 토큰 생성
→ 신규 관리자 비밀번호 설정
→ 계정 생성 완료
```

---

# 4.3 stores

매장(지점) 정보 테이블

## 목적

- 다중 지점 관리
- 대시보드 필터 기준
- 매출 데이터 연결

## Schema

```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

## 예시 데이터

| name |
|---|
| North York |
| Downtown |

---

# 4.4 sales

핵심 매출 데이터 테이블

## 목적

- 일일 매출 저장
- 현금 분석
- Holiday 분석
- AI 분석 데이터 제공

## Schema

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

    actual_cash_closing NUMERIC(12,2) DEFAULT 0,

    expected_cash_amount NUMERIC(12,2) DEFAULT 0,

    cash_difference NUMERIC(12,2) DEFAULT 0,

    total_sales NUMERIC(12,2),

    net_sales NUMERIC(12,2),

    note TEXT,

    created_by UUID REFERENCES admins(id),

    updated_by UUID REFERENCES admins(id),

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(store_id, sales_date)
);
```

---

## 매출 필드 설명

| Field | Description |
|---|---|
| card_sales | 카드 결제 금액 |
| card_tip | 카드 팁 |
| cash_sales | 현금 매출 |
| uber_eats_sales | Uber Eats 매출 |
| doordash_sales | DoorDash 매출 |
| cash_and_carry_sales | 캐시앤캐리 매출 |
| actual_cash_closing | 실제 마감 현금 |

---

## 핵심 계산 로직

### total_sales

```text
총매출 =
카드 + 현금 + Uber Eats + DoorDash + Cash & Carry
```

---

### cash_difference

```text
현금 차액 =
실제 마감 현금 - 예상 현금
```

---

# 4.5 event_masters

Holiday 이름 기준 그룹 테이블

## 목적

유동적인 날짜를 가지는 Holiday를 동일 그룹으로 관리하기 위함.

예:

- Victoria Day 2024
- Victoria Day 2025

를 모두 동일 Holiday 그룹으로 묶는다.

## Schema

```sql
CREATE TABLE event_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL,

    category VARCHAR(50),

    description TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

## 예시 데이터

| name |
|---|
| Victoria Day |
| Canada Day |
| Labour Day |
| Christmas |

---

# 4.6 events

연도별 Holiday 날짜 테이블

## 목적

Holiday 실제 날짜 저장

## Schema

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_master_id UUID REFERENCES event_masters(id),

    event_date DATE NOT NULL,

    year INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 예시 데이터

| Holiday | Date |
|---|---|
| Victoria Day | 2024-05-20 |
| Victoria Day | 2025-05-19 |

---

## 핵심 분석 로직

```text
Holiday 선택
→ EventMaster 조회
→ 연도별 Event 조회
→ 해당 날짜 Sales 조회
→ 연도별 비교 분석
```

---

# 4.7 audit_logs

수정 이력 추적 테이블

## 목적

Locking 없이 상시 수정 가능하도록 하되,
모든 수정 이력을 추적하기 위함.

## 필수 요구사항

반드시 기록해야 함:

- 수정 전 값
- 수정 후 값
- 수정자
- 수정 시간
- 수정 사유

---

## Schema

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

---

## 예시 데이터

| field_name | old_value | new_value |
|---|---|---|
| cash_sales | 500 | 650 |

---

# 4.8 bulk_upload_histories

엑셀 업로드 기록 테이블

## 목적

기존 엑셀 데이터를 일괄 업로드하기 위한 기록 관리

## Schema

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

## upload_status 예시

```text
PROCESSING
COMPLETED
FAILED
```

---

# 4.9 ai_analysis_reports

AI 분석 결과 저장 테이블

## 목적

GPT 기반 매출 인사이트 저장

## Schema

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

---

## report_type 예시

| Type |
|---|
| WEEKLY |
| MONTHLY |
| HOLIDAY |
| CASH_FLOW |

---

# 4.10 weather_snapshots (Future Extension)

향후 Weather API 연동 대비 테이블

## 목적

날씨와 매출 상관관계 분석 확장 대비

## Schema

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

# 5. Recommended Indexes

## 매출 조회 최적화

```sql
CREATE INDEX idx_sales_store_date
ON sales(store_id, sales_date);
```

---

## Holiday 조회 최적화

```sql
CREATE INDEX idx_events_master_date
ON events(event_master_id, event_date);
```

---

## Audit 조회 최적화

```sql
CREATE INDEX idx_audit_logs_record
ON audit_logs(record_id);
```

---

# 6. Data Flow Design

# 매출 입력 흐름

```text
관리자 입력
→ Validation
→ Sales 저장
→ Audit Log 생성
→ Dashboard 반영
→ AI 분석 가능 상태 저장
```

---

# Holiday 분석 흐름

```text
Holiday 선택
→ EventMaster 조회
→ 연도별 Event 조회
→ Sales 연결
→ 비교 데이터 생성
→ Dashboard 시각화
```

---

# 7. Security Considerations

## 인증 관련

- JWT 인증 권장
- bcrypt password hashing 권장
- Refresh Token 권장

---

## 데이터 보호

- SQL Injection 방지
- Audit Logging 필수
- 관리자 인증 Middleware 적용

---

# 8. Scalability Considerations

## 향후 확장 가능 요소

- Weather API
- POS 연동
- 모바일 앱
- AI 매출 예측
- 실시간 Dashboard
- PDF Export
- 다국어 지원

---

# 9. Final Database Summary

Kibo Dashboard DB 구조는 다음 목표를 기반으로 설계되었다.

- 매출 데이터의 안정적 저장
- Holiday 중심 분석
- 현금 흐름 추적
- 관리자 수정 이력 추적
- AI 분석 확장성 확보
- 향후 외부 API 연동 가능 구조 유지

본 설계는 사용자가 제공한 요구사항만을 기반으로 작성된 DB 중심 설계 문서이다.
