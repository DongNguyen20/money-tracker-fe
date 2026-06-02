-- =============================================================================
-- MONEY TRACKER — DATABASE SCHEMA
-- Target: PostgreSQL 18
-- =============================================================================
--
-- Tận dụng các tính năng mới của PostgreSQL 18:
--   • UUIDv7 (uuidv7())          — ID sắp xếp theo thời gian, tối ưu B-tree
--   • Virtual Generated Columns  — Tính toán on-demand, không lưu đĩa
--   • WITHOUT OVERLAPS           — Ràng buộc temporal cho rent_bills
--   • gen_random_uuid() fallback — Không cần extension uuid-ossp
--
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. USERS — Bảng người dùng
-- =============================================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,             -- Bcrypt / Argon2 hash only
    fullname    TEXT,
    avatar_url  TEXT,
    currency    TEXT NOT NULL DEFAULT 'VND'
                    CHECK (currency IN ('VND', 'USD', 'EUR', 'JPY')),
    locale      TEXT NOT NULL DEFAULT 'vi-VN',
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'deleted')),
    last_login_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  users IS 'Tài khoản người dùng hệ thống';
COMMENT ON COLUMN users.password_hash IS 'Mật khẩu đã hash (Argon2id khuyến nghị)';

-- =============================================================================
-- 2. CATEGORIES — Danh mục chi tiêu / thu nhập / tiết kiệm
-- =============================================================================
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    icon        TEXT NOT NULL,               -- Emoji hoặc icon key (e.g. '🍜')
    type        TEXT NOT NULL
                    CHECK (type IN ('expense', 'income', 'saving')),
    color       TEXT NOT NULL
                    CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),  -- HEX color
    sort_order  INT NOT NULL DEFAULT 0,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_categories_user_name_type UNIQUE (user_id, name, type)
);

COMMENT ON TABLE  categories IS 'Danh mục phân loại giao dịch';
COMMENT ON COLUMN categories.is_system IS 'Danh mục mặc định do hệ thống tạo';

-- =============================================================================
-- 3. TRANSACTIONS — Giao dịch chi tiêu / thu nhập / tiết kiệm
-- =============================================================================
-- Partitioned by RANGE on `date` for scalable time-series queries.
-- Mỗi năm tạo 1 partition, lịch sử lâu năm truy vấn vẫn nhanh.

CREATE TABLE transactions (
    id          UUID NOT NULL DEFAULT uuidv7(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount      NUMERIC(15, 0) NOT NULL CHECK (amount > 0),  -- VND không có lẻ
    type        TEXT NOT NULL
                    CHECK (type IN ('expense', 'income', 'saving')),
    note        TEXT,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, date)                   -- Composite PK required for partitioning
) PARTITION BY RANGE (date);

-- Partitions mẫu — tạo thêm cho các năm tiếp theo
CREATE TABLE transactions_2024 PARTITION OF transactions
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE transactions_2025 PARTITION OF transactions
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE transactions_2026 PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE transactions_default PARTITION OF transactions DEFAULT;

COMMENT ON TABLE transactions IS 'Giao dịch tài chính: chi tiêu, thu nhập, tiết kiệm (partitioned by year)';

-- =============================================================================
-- 4. STOCK TRANSACTIONS — Lệnh mua/bán chứng khoán
-- =============================================================================
CREATE TABLE stock_transactions (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker      TEXT NOT NULL
                    CHECK (ticker ~ '^[A-Z0-9]{1,10}$'),  -- e.g. 'VNM', 'HPG'
    type        TEXT NOT NULL
                    CHECK (type IN ('buy', 'sell')),
    quantity    INT NOT NULL CHECK (quantity > 0),
    price       NUMERIC(15, 2) NOT NULL CHECK (price > 0),

    -- PG18: Virtual Generated Column — tính on-demand, không tốn đĩa
    total       NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * price) VIRTUAL,

    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  stock_transactions IS 'Lệnh giao dịch chứng khoán (mua/bán)';
COMMENT ON COLUMN stock_transactions.total IS '[PG18 Virtual] Tổng giá trị = quantity × price, tính khi đọc';

-- =============================================================================
-- 5. STOCK CASH TRANSACTIONS — Nộp/Rút tiền tài khoản chứng khoán
-- =============================================================================
CREATE TABLE stock_cash_transactions (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL
                    CHECK (type IN ('deposit', 'withdraw')),
    amount      NUMERIC(15, 0) NOT NULL CHECK (amount > 0),
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stock_cash_transactions IS 'Giao dịch tiền mặt trong tài khoản chứng khoán';

-- =============================================================================
-- 6. STOCK PRICES — Giá hiện tại (cache)
-- =============================================================================
CREATE TABLE stock_prices (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker      TEXT NOT NULL
                    CHECK (ticker ~ '^[A-Z0-9]{1,10}$'),
    price       NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, ticker)
);

COMMENT ON TABLE stock_prices IS 'Cache giá thị trường hiện tại do user nhập tay';

-- =============================================================================
-- 7. RENT SETTINGS — Cấu hình đơn giá tiền nhà
-- =============================================================================
CREATE TABLE rent_settings (
    user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_base       NUMERIC(15, 0) NOT NULL DEFAULT 2200000 CHECK (default_base >= 0),
    price_electricity  NUMERIC(15, 0) NOT NULL DEFAULT 4500    CHECK (price_electricity >= 0),
    price_water        NUMERIC(15, 0) NOT NULL DEFAULT 20000   CHECK (price_water >= 0),
    default_wifi       NUMERIC(15, 0) NOT NULL DEFAULT 200000  CHECK (default_wifi >= 0),
    default_garbage    NUMERIC(15, 0) NOT NULL DEFAULT 30000   CHECK (default_garbage >= 0),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE rent_settings IS 'Cấu hình đơn giá điện/nước/wifi mặc định cho mỗi user';

-- =============================================================================
-- 8. RENT BILLS — Hoá đơn tiền nhà hàng tháng
-- =============================================================================
CREATE TABLE rent_bills (
    id                  UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month               TEXT NOT NULL
                            CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- 'YYYY-MM'
    base_price          NUMERIC(15, 0) NOT NULL CHECK (base_price >= 0),
    wifi_price          NUMERIC(15, 0) NOT NULL DEFAULT 0 CHECK (wifi_price >= 0),
    garbage_price       NUMERIC(15, 0) NOT NULL DEFAULT 0 CHECK (garbage_price >= 0),
    other_price         NUMERIC(15, 0) NOT NULL DEFAULT 0 CHECK (other_price >= 0),
    electricity_usage   INT NOT NULL DEFAULT 0 CHECK (electricity_usage >= 0),     -- kWh
    water_usage         INT NOT NULL DEFAULT 0 CHECK (water_usage >= 0),           -- m³
    electricity_price   NUMERIC(15, 0) NOT NULL CHECK (electricity_price >= 0),    -- VND/kWh
    water_price         NUMERIC(15, 0) NOT NULL CHECK (water_price >= 0),          -- VND/m³

    -- PG18: Virtual Generated Columns — không tốn đĩa, tính khi SELECT
    electricity_total   NUMERIC(15, 0) GENERATED ALWAYS AS (electricity_usage * electricity_price) VIRTUAL,
    water_total         NUMERIC(15, 0) GENERATED ALWAYS AS (water_usage * water_price) VIRTUAL,

    total_price         NUMERIC(15, 0) NOT NULL CHECK (total_price >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Mỗi user chỉ có 1 hoá đơn / tháng
    CONSTRAINT uq_rent_bills_user_month UNIQUE (user_id, month)
);

COMMENT ON TABLE  rent_bills IS 'Hoá đơn tiền nhà/điện/nước theo từng tháng';
COMMENT ON COLUMN rent_bills.electricity_total IS '[PG18 Virtual] = electricity_usage × electricity_price';
COMMENT ON COLUMN rent_bills.water_total IS '[PG18 Virtual] = water_usage × water_price';

-- =============================================================================
-- INDEXES — Tối ưu truy vấn
-- =============================================================================

-- Transactions: truy vấn theo user + khoảng thời gian + loại
CREATE INDEX idx_txn_user_date      ON transactions (user_id, date DESC);
CREATE INDEX idx_txn_user_type_date ON transactions (user_id, type, date DESC);
CREATE INDEX idx_txn_category       ON transactions (category_id);

-- Stock Transactions: truy vấn theo user + mã CK + thời gian
CREATE INDEX idx_stock_txn_user_ticker  ON stock_transactions (user_id, ticker, date DESC);

-- Stock Cash: truy vấn theo user + thời gian
CREATE INDEX idx_stock_cash_user_date   ON stock_cash_transactions (user_id, date DESC);

-- Rent Bills: truy vấn theo user + tháng
CREATE INDEX idx_rent_bills_user_month  ON rent_bills (user_id, month DESC);

-- =============================================================================
-- AUTO-UPDATE updated_at — Trigger tự động cập nhật thời gian sửa đổi
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cho mọi bảng có updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'users', 'categories', 'transactions',
        'stock_transactions', 'stock_cash_transactions',
        'stock_prices', 'rent_settings', 'rent_bills'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER tr_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- =============================================================================
-- VIEWS — Tổng hợp dữ liệu thường dùng
-- =============================================================================

-- View: Tổng hợp tài chính theo tháng cho mỗi user
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
    user_id,
    DATE_TRUNC('month', date)::DATE                        AS month,
    SUM(amount) FILTER (WHERE type = 'income')             AS total_income,
    SUM(amount) FILTER (WHERE type = 'expense')            AS total_expense,
    SUM(amount) FILTER (WHERE type = 'saving')             AS total_saving,
    SUM(amount) FILTER (WHERE type = 'income')
      - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)
      - COALESCE(SUM(amount) FILTER (WHERE type = 'saving'), 0)  AS net_balance,
    COUNT(*)                                                AS total_transactions
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date);

COMMENT ON VIEW v_monthly_summary IS 'Tổng hợp thu/chi/tiết kiệm theo tháng';

-- View: Danh mục chứng khoán hiện tại (portfolio snapshot)
CREATE OR REPLACE VIEW v_stock_portfolio AS
SELECT
    st.user_id,
    st.ticker,
    SUM(CASE WHEN st.type = 'buy' THEN st.quantity ELSE -st.quantity END)    AS net_quantity,
    SUM(CASE WHEN st.type = 'buy' THEN st.quantity * st.price ELSE 0 END)
      / NULLIF(SUM(CASE WHEN st.type = 'buy' THEN st.quantity ELSE 0 END), 0)
                                                                              AS avg_buy_price,
    COALESCE(sp.price, 0)                                                     AS current_price,
    SUM(CASE WHEN st.type = 'buy' THEN st.quantity ELSE -st.quantity END)
      * COALESCE(sp.price, 0)                                                 AS market_value
FROM stock_transactions st
LEFT JOIN stock_prices sp ON sp.user_id = st.user_id AND sp.ticker = st.ticker
GROUP BY st.user_id, st.ticker, sp.price
HAVING SUM(CASE WHEN st.type = 'buy' THEN st.quantity ELSE -st.quantity END) > 0;

COMMENT ON VIEW v_stock_portfolio IS 'Snapshot danh mục cổ phiếu đang nắm giữ';

-- View: Số dư tiền mặt tài khoản chứng khoán
CREATE OR REPLACE VIEW v_stock_cash_balance AS
SELECT
    sct.user_id,
    SUM(CASE WHEN sct.type = 'deposit' THEN sct.amount ELSE -sct.amount END)
      - COALESCE(SUM(CASE WHEN st.type = 'buy' THEN st.quantity * st.price
                           WHEN st.type = 'sell' THEN -(st.quantity * st.price)
                           ELSE 0 END), 0)                                    AS cash_balance
FROM stock_cash_transactions sct
LEFT JOIN stock_transactions st ON st.user_id = sct.user_id
GROUP BY sct.user_id;

COMMENT ON VIEW v_stock_cash_balance IS 'Số dư tiền mặt trong tài khoản CK';

-- =============================================================================
-- SEED DATA — Dữ liệu mẫu để phát triển & kiểm thử
-- =============================================================================

-- User mẫu
INSERT INTO users (id, email, password_hash, fullname) VALUES
    ('019723a0-0000-7000-8000-000000000001',
     'demo@moneytracker.vn',
     -- Argon2id hash placeholder (replace in production)
     '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+daw',
     'Nguyễn Văn Demo');

-- Danh mục mặc định
INSERT INTO categories (user_id, name, icon, type, color, sort_order, is_system) VALUES
    ('019723a0-0000-7000-8000-000000000001', 'Ăn uống',    '🍜', 'expense', '#ef4444', 1, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Thuê nhà',   '🏠', 'expense', '#f59e0b', 2, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Di chuyển',  '🚗', 'expense', '#3b82f6', 3, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Mua sắm',    '🛍️', 'expense', '#ec4899', 4, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Giải trí',   '🎬', 'expense', '#8b5cf6', 5, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Sức khoẻ',   '💊', 'expense', '#06b6d4', 6, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Đầu tư',     '📈', 'expense', '#6366f1', 7, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Lương',      '💰', 'income',  '#10b981', 1, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Thưởng',     '🎁', 'income',  '#22c55e', 2, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Freelance',  '💻', 'income',  '#14b8a6', 3, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Tiết kiệm',  '🏦', 'saving',  '#6366f1', 1, TRUE),
    ('019723a0-0000-7000-8000-000000000001', 'Quỹ khẩn cấp','🛡️', 'saving',  '#f97316', 2, TRUE);

-- Cấu hình tiền nhà mặc định
INSERT INTO rent_settings (user_id) VALUES
    ('019723a0-0000-7000-8000-000000000001');

-- Dữ liệu mẫu cho rent và rent_detail
-- Lưu ý: Backend sử dụng bảng rent và rent_detail (khác với rent_bills trong schema)

-- Rent mẫu
INSERT INTO rent (date, name, total_amount, date_of_origin, payment_date, status, notes, created_at, updated_at) VALUES
    ('2025-01-01', 'Tiền nhà tháng 1/2025', 3500000.00, '2025-01-01', '2025-01-05', 'PAID', 'Đã thanh toán đầy đủ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('2025-02-01', 'Tiền nhà tháng 2/2025', 3600000.00, '2025-02-01', '2025-02-05', 'PAID', 'Đã thanh toán đầy đủ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('2025-03-01', 'Tiền nhà tháng 3/2025', 3400000.00, '2025-03-01', '2025-03-10', 'PAID', 'Giảm do đi công tác', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('2025-04-01', 'Tiền nhà tháng 4/2025', 3500000.00, '2025-04-01', NULL, 'PENDING', 'Chưa thanh toán', CURRENT_TIMESTAMP, NULL),
    ('2025-05-01', 'Tiền nhà tháng 5/2025', 3700000.00, '2025-05-01', NULL, 'PENDING', 'Chưa thanh toán', CURRENT_TIMESTAMP, NULL);

-- RentDetail mẫu cho từng rent
-- Rent id = 1 (Tháng 1/2025)
INSERT INTO rent_detail (rent_id, base_amount, wifi_amount, water_amount, electricity_amount, other_amount, kwh_consumed, m3_consumed, notes, created_at, updated_at) VALUES
    (1, 2200000.00, 200000.00, 60000.00, 540000.00, 50000.00, 120, 3, 'Tiền điện: 120kWh x 4500đ/kWh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rent id = 2 (Tháng 2/2025)
INSERT INTO rent_detail (rent_id, base_amount, wifi_amount, water_amount, electricity_amount, other_amount, kwh_consumed, m3_consumed, notes, created_at, updated_at) VALUES
    (2, 2200000.00, 200000.00, 80000.00, 720000.00, 40000.00, 160, 4, 'Tiền điện: 160kWh x 4500đ/kWh', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rent id = 3 (Tháng 3/2025)
INSERT INTO rent_detail (rent_id, base_amount, wifi_amount, water_amount, electricity_amount, other_amount, kwh_consumed, m3_consumed, notes, created_at, updated_at) VALUES
    (3, 2200000.00, 200000.00, 50000.00, 450000.00, 30000.00, 100, 2.5, 'Giảm điện do đi công tác 1 tuần', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rent id = 4 (Tháng 4/2025)
INSERT INTO rent_detail (rent_id, base_amount, wifi_amount, water_amount, electricity_amount, other_amount, kwh_consumed, m3_consumed, notes, created_at, updated_at) VALUES
    (4, 2200000.00, 200000.00, 70000.00, 630000.00, 40000.00, 140, 3.5, NULL, CURRENT_TIMESTAMP, NULL);

-- Rent id = 5 (Tháng 5/2025)
INSERT INTO rent_detail (rent_id, base_amount, wifi_amount, water_amount, electricity_amount, other_amount, kwh_consumed, m3_consumed, notes, created_at, updated_at) VALUES
    (5, 2200000.00, 200000.00, 75000.00, 675000.00, 50000.00, 150, 3.75, NULL, CURRENT_TIMESTAMP, NULL);

COMMIT;

-- =============================================================================
-- NOTES CHO TEAM BACKEND
-- =============================================================================
--
-- 1. UUIDv7 (uuidv7()): Native PG18, tạo ID sắp xếp theo thời gian.
--    Ưu điểm so với UUIDv4: giảm page splits trên B-tree, index nhỏ hơn,
--    có thể extract timestamp từ ID mà không cần trường created_at.
--
-- 2. Virtual Generated Columns: `total` trong stock_transactions và
--    electricity_total / water_total trong rent_bills.
--    → Không lưu đĩa, tính khi SELECT → giảm storage, giảm write I/O.
--    → KHÔNG THỂ tạo index trên virtual column. Nếu cần filter/sort
--      theo total, đổi sang STORED.
--
-- 3. Table Partitioning: transactions được partition theo năm.
--    → Thêm partition mới trước khi sang năm:
--      CREATE TABLE transactions_2027 PARTITION OF transactions
--          FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
--    → Có thể viết cron job hoặc pg_partman extension để tự động hoá.
--
-- 4. NUMERIC(15,0) cho VND: Đồng Việt Nam không có phần lẻ.
--    Dùng NUMERIC thay vì BIGINT để tránh lỗi tràn số khi tính toán.
--    Các trường giá chứng khoán dùng NUMERIC(15,2) vì có thể giao dịch
--    trên sàn quốc tế (USD, etc.).
--
-- 5. Security Checklist:
--    ☐ Không bao giờ lưu plaintext password
--    ☐ Row-Level Security (RLS) cho multi-tenant:
--        ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
--        CREATE POLICY p_txn_user ON transactions
--            USING (user_id = current_setting('app.current_user_id')::UUID);
--    ☐ Prepared statements / parameterized queries để chống SQL injection
--    ☐ Rate limiting cho API endpoints
--
-- 6. Migration Strategy:
--    Từ localStorage → PostgreSQL:
--    a) Export localStorage ra JSON
--    b) Map client IDs (cat_1, cat_2...) → UUIDv7
--    c) Insert bằng COPY command cho performance
--    d) Validate bằng v_monthly_summary view
--
