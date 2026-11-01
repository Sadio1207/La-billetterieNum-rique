CREATE TABLE IF NOT EXISTS organizers (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'organizer', 'scanner')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash BYTEA PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  city TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  public_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  price_xof BIGINT NOT NULL CHECK (price_xof >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  sold_initial INTEGER NOT NULL DEFAULT 0 CHECK (sold_initial >= 0),
  sold INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  perks TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (event_id, id),
  CHECK (sold_initial + sold + reserved <= capacity)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('reserved', 'pending_review', 'paid', 'rejected', 'expired')),
  currency CHAR(3) NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  subtotal_xof BIGINT NOT NULL CHECK (subtotal_xof >= 0),
  fees_xof BIGINT NOT NULL DEFAULT 0 CHECK (fees_xof >= 0),
  discount_xof BIGINT NOT NULL DEFAULT 0 CHECK (discount_xof >= 0),
  total_xof BIGINT NOT NULL CHECK (total_xof >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('wave', 'orange_money')),
  transaction_reference TEXT,
  hold_until TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total_xof = subtotal_xof + fees_xof - discount_xof)
);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(lower(customer_email));
CREATE UNIQUE INDEX IF NOT EXISTS orders_transaction_reference_idx ON orders(lower(transaction_reference)) WHERE transaction_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 8),
  unit_price_xof BIGINT NOT NULL CHECK (unit_price_xof >= 0),
  FOREIGN KEY (event_id, tier_id) REFERENCES ticket_tiers(event_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS order_items_event_tier_idx ON order_items(event_id, tier_id);

CREATE TABLE IF NOT EXISTS payment_proofs (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  private_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type = 'image/jpeg'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  holder_name TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_order_idx ON tickets(order_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  organizer_id UUID REFERENCES organizers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
