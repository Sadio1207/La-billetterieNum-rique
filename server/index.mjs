import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import argon2 from "argon2";
import pg from "pg";
import { createHmac, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile, readdir, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 8080);
const appOrigin = process.env.APP_ORIGIN || (production ? "" : `http://localhost:${port}`);
const dbUrl = process.env.DATABASE_URL || "";
const sessionSecret = process.env.SESSION_SECRET || "";
const uploadDir = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(root, "private-uploads"));
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const reservationLifetimeMs = 20 * 60 * 1000;
const reviewHoldMs = 24 * 60 * 60 * 1000;
const maxProofBytes = 5 * 1024 * 1024;
const cookieName = "tgp_admin_session";
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

if (!appOrigin || !dbUrl || sessionSecret.length < 32 || /^(change|remplacer|secret|password)/i.test(sessionSecret)) {
  throw new Error("Configuration requise : APP_ORIGIN, DATABASE_URL et SESSION_SECRET (32 caracteres minimum).");
}
if (production && !appOrigin.startsWith("https://")) {
  throw new Error("APP_ORIGIN doit utiliser HTTPS en production.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT invalide.");

const app = express();
app.disable("x-powered-by");
const trustedProxyHops = Number(process.env.TRUST_PROXY || 0);
if (trustedProxyHops > 0) app.set("trust proxy", trustedProxyHops);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: production ? [] : null
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use("/api/orders", express.json({ limit: "8mb", strict: true }));
app.use("/api/admin/events", express.json({ limit: "2mb", strict: true }));
app.use(express.json({ limit: "64kb", strict: true }));

const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "strict",
  path: "/",
  maxAge: sessionLifetimeMs
};
const sha256 = (value) => createHash("sha256").update(value).digest();
const randomRef = () => "TGP-" + randomBytes(24).toString("hex").toUpperCase();
const csrfFor = (sessionToken) => createHmac("sha256", sessionSecret).update("csrf:" + sessionToken).digest("base64url");
const xof = (value) => Math.max(0, Math.floor(Number(value) || 0));
const cleanText = (value, max = 240) => String(value ?? "").trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const dateValue = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const asJson = (value, fallback = {}) => {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value && typeof value === "object" ? value : fallback;
};
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};
function cookieValue(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}
function requireSameOrigin(req, res, next) {
  if (req.get("origin") !== appOrigin) return res.status(403).json({ error: "Origine non autorisee." });
  next();
}
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
function reject(res, status, message) {
  return res.status(status).json({ error: message });
}
// --- MAINTENANCE COMPTES DE PAIEMENT (WAVE & ORANGE MONEY) ---
// Récupère les numéros et libellés configurés dans .env pour chaque mode de paiement.
// Si un numéro est absent, le serveur bloque les réservations pour ce mode avec un statut 503.
// En cas de mise à jour des numéros dans .env, recharger avec : docker compose up -d app
//
// [ÉVOLUTION API DIRECTE] :
// Lorsque vous aurez une API Wave (Checkout API) et/ou Orange Money (Web Payment API) :
// Au lieu de retourner un simple numéro de téléphone pour un transfert manuel, cette fonction
// ou le service de paiement initialisera la session de paiement auprès de l'API Wave ou Orange Money
// et retournera une URL de paiement direct (checkout_url / wave_launch_url).
function paymentConfig(method) {
  if (method === "wave") return { label: cleanText(process.env.PAYMENT_WAVE_LABEL), number: cleanText(process.env.PAYMENT_WAVE_NUMBER) };
  if (method === "orange_money") return { label: cleanText(process.env.PAYMENT_ORANGE_MONEY_LABEL), number: cleanText(process.env.PAYMENT_ORANGE_MONEY_NUMBER) };
  return null;
}
function supportPhoneConfig() {
  const value = cleanText(process.env.SUPPORT_PHONE || "+221 78 545 55 40", 40);
  const digits = value.replace(/\D/g, "");
  return /^\+[\d\s().-]+$/.test(value) && digits.length >= 8 && digits.length <= 15 ? value : "";
}
function supportEmailConfig() {
  const value = cleanText(process.env.SUPPORT_EMAIL, 254).toLowerCase();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(value) ? value : "";
}
function publicOrder(row, items, tickets = []) {
  return {
    ref: row.reference,
    status: row.status,
    currency: row.currency,
    subtotal: Number(row.subtotal_xof),
    fees: Number(row.fees_xof),
    discount: Number(row.discount_xof),
    total: Number(row.total_xof),
    paymentMethod: row.payment_method,
    holdUntil: row.hold_until,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    items,
    tickets: row.status === "paid" ? tickets : []
  };
}
async function getOrderPayload(client, row) {
  const items = await client.query(
    "SELECT event_id, tier_id, event_title, tier_name, quantity, unit_price_xof FROM order_items WHERE order_id = $1 ORDER BY id",
    [row.id]
  );
  const tickets = row.status === "paid"
    ? await client.query("SELECT t.code, t.holder_name AS holder, t.checked_in_at, i.event_id, i.tier_id FROM tickets t JOIN order_items i ON i.id = t.item_id WHERE t.order_id = $1 ORDER BY t.code", [row.id])
    : { rows: [] };
  return publicOrder(row, items.rows.map((item) => ({
    eventId: item.event_id,
    tierId: item.tier_id,
    eventTitle: item.event_title,
    tierName: item.tier_name,
    qty: item.quantity,
    unitPrice: Number(item.unit_price_xof)
  })), tickets.rows.map((ticket) => ({ code: ticket.code, holder: ticket.holder, checkedInAt: ticket.checked_in_at, eventId: ticket.event_id, tierId: ticket.tier_id })));
}
async function audit(client, organizerId, action, entityType, entityId, metadata = {}) {
  await client.query(
    "INSERT INTO audit_log (organizer_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [organizerId || null, action, entityType, String(entityId), JSON.stringify(metadata)]
  );
}
async function recordLoginFailure(client, ipHash) {
  await client.query(
    `INSERT INTO login_attempts (ip_hash, failed_count, window_started_at, locked_until)
     VALUES ($1, 1, now(), NULL)
     ON CONFLICT (ip_hash) DO UPDATE SET
       failed_count = CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN 1 ELSE login_attempts.failed_count + 1 END,
       window_started_at = CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END,
       locked_until = CASE WHEN (CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN 1 ELSE login_attempts.failed_count + 1 END) >= 8 THEN now() + interval '15 minutes' ELSE login_attempts.locked_until END`,
    [ipHash]
  );
}
async function releaseExpiredReservations(client) {
  const expired = await client.query(
    "SELECT id FROM orders WHERE status = 'reserved' AND hold_until <= now() FOR UPDATE SKIP LOCKED"
  );
  for (const { id } of expired.rows) {
    const items = await client.query("SELECT event_id, tier_id, quantity FROM order_items WHERE order_id = $1", [id]);
    for (const item of items.rows) {
      await client.query("UPDATE ticket_tiers SET reserved = GREATEST(0, reserved - $3) WHERE event_id = $1 AND id = $2", [item.event_id, item.tier_id, item.quantity]);
    }
    await client.query("UPDATE orders SET status = 'expired' WHERE id = $1", [id]);
  }
}
async function sweepExpiredReservations() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await releaseExpiredReservations(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}
async function initDatabase() {
  const migrationClient = await pool.connect();
  try {
    await migrationClient.query("SELECT pg_advisory_lock(8347261901)");
    await migrationClient.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    const migrationsPath = path.join(__dirname, "migrations");
    const files = (await readdir(migrationsPath)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file)).sort();
    for (const file of files) {
      const version = file.split("_")[0];
      const done = await migrationClient.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
      if (done.rowCount) continue;
      await migrationClient.query("BEGIN");
      try {
        await migrationClient.query(await readFile(path.join(migrationsPath, file), "utf8"));
        await migrationClient.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
        await migrationClient.query("COMMIT");
      } catch (error) {
        await migrationClient.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await migrationClient.query("SELECT pg_advisory_unlock(8347261901)").catch(() => {});
    migrationClient.release();
  }
  // --- MAINTENANCE COMPTE ADMINISTRATEUR INITIAL ---
  // Si la table 'organizers' est vide (premier démarrage), on crée le compte admin
  // à partir de INITIAL_ADMIN_EMAIL (ex: terangapass@billetterie.sn) et INITIAL_ADMIN_PASSWORD (ex: terangaPlus!).
  // Le mot de passe est haché avec Argon2id. Si vous devez réinitialiser ce mot de passe
  // ultérieurement, mettez directement à jour le champ 'password_hash' de la table 'organizers'.
  const count = await pool.query("SELECT count(*)::int AS count FROM organizers");
  if (count.rows[0].count === 0) {
    const email = cleanText(process.env.INITIAL_ADMIN_EMAIL, 254).toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD || "";
    if (!validEmail(email) || password.length < 10 || /^(change|remplacer|admin|password)/i.test(password)) {
      throw new Error("Premiere initialisation : definissez INITIAL_ADMIN_EMAIL et un INITIAL_ADMIN_PASSWORD unique de 10 caracteres minimum.");
    }
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await pool.query("INSERT INTO organizers (id, email, password_hash, role) VALUES ($1, $2, $3, 'admin')", [randomUUID(), email, hash]);
    console.log("Compte administrateur initial cree. Le mot de passe n'est pas affiche.");
  }
  await pool.query("DELETE FROM admin_sessions WHERE expires_at <= now()");
}

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxProofBytes, files: 1, fields: 4, parts: 6 },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== "image/jpeg") return callback(new Error("La preuve doit etre une image JPEG."));
    callback(null, true);
  }
});

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return requireSameOrigin(req, res, next);
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Reessayez plus tard." }
});

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
}));

app.get("/api/bootstrap", asyncRoute(async (_req, res) => {
  await sweepExpiredReservations();
  const eventRows = await pool.query(
    `SELECT e.id, e.title, e.category, e.starts_at, e.city, e.venue_name, e.public_data,
            t.id AS tier_id, t.name AS tier_name, t.price_xof, t.capacity, t.sold_initial, t.sold, t.reserved, t.perks
     FROM events e LEFT JOIN ticket_tiers t ON t.event_id = e.id
     WHERE e.active = TRUE ORDER BY e.starts_at, e.title, t.price_xof`
  );
  const eventsById = new Map();
  for (const row of eventRows.rows) {
    let event = eventsById.get(row.id);
    if (!event) {
      const data = asJson(row.public_data);
      event = {
        ...data,
        id: row.id,
        title: row.title,
        category: row.category,
        date: row.starts_at,
        city: row.city,
        venue: { ...(data.venue || {}), name: row.venue_name, city: row.city },
        tiers: []
      };
      eventsById.set(row.id, event);
    }
    if (row.tier_id) event.tiers.push({
      id: row.tier_id,
      name: row.tier_name,
      price: Number(row.price_xof),
      stock: row.capacity,
      soldInitial: row.sold_initial + row.sold,
      available: Math.max(0, row.capacity - row.sold_initial - row.sold - row.reserved),
      perks: row.perks
    });
  }
  res.json({
    events: [...eventsById.values()],
    paymentAccounts: {
      accountName: cleanText(process.env.PAYMENT_RECEIVER_NAME),
      orangeMoney: paymentConfig("orange_money")?.number || "",
      wave: paymentConfig("wave")?.number || ""
    },
    supportPhone: supportPhoneConfig(),
    supportEmail: supportEmailConfig(),
    serviceFeeXof: Math.max(0, Number(process.env.SERVICE_FEE_XOF || 0))
  });
}));

app.post("/api/orders", (_req, res) => reject(res, 410, "Ce parcours a ete remplace par la reservation avant paiement."));

// --- AUTHENTIFICATION ESPACE ORGANISATEUR ---
// Route : POST /api/admin/login
// Paramètres attendus (JSON) : { email, password }
// Vérifie l'e-mail et le mot de passe (via Argon2id) contre la table 'organizers'.
// Inclut un rate limiter (12 essais / 15 min) et un verrouillage par IP contre les attaques par force brute.
app.post("/api/admin/login", loginLimiter, asyncRoute(async (req, res) => {
  const email = cleanText(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const ipHash = createHmac("sha256", sessionSecret).update("ip:" + req.ip).digest("hex");
  const attempt = await pool.query("SELECT failed_count, locked_until FROM login_attempts WHERE ip_hash = $1", [ipHash]);
  if (attempt.rows[0]?.locked_until && new Date(attempt.rows[0].locked_until).getTime() > Date.now()) {
    return reject(res, 429, "Trop de tentatives. Reessayez dans quelques minutes.");
  }
  const result = await pool.query("SELECT id, email, password_hash, role FROM organizers WHERE lower(email) = $1 AND active = TRUE", [email]);
  const user = result.rows[0];
  const valid = user ? await argon2.verify(user.password_hash, password).catch(() => false) : false;
  if (!valid) {
    await recordLoginFailure(pool, ipHash);
    return reject(res, 401, "Adresse e-mail ou mot de passe incorrect.");
  }
  await pool.query("DELETE FROM login_attempts WHERE ip_hash = $1", [ipHash]);
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + sessionLifetimeMs);
  await pool.query("INSERT INTO admin_sessions (token_hash, organizer_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), user.id, expires]);
  res.cookie(cookieName, token, cookieOptions);
  res.json({ user: { email: user.email, role: user.role }, csrfToken: csrfFor(token), expiresAt: expires });
}));

async function loadOrganizer(req, res, next) {
  const token = cookieValue(req, cookieName);
  if (!token || token.length > 128) return reject(res, 401, "Connexion organisateur requise.");
  const result = await pool.query(
    `SELECT o.id, o.email, o.role, s.expires_at
     FROM admin_sessions s JOIN organizers o ON o.id = s.organizer_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND o.active = TRUE`,
    [sha256(token)]
  );
  if (!result.rows[0]) return reject(res, 401, "Session expiree. Reconnectez-vous.");
  req.organizer = result.rows[0];
  req.sessionToken = token;
  next();
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.organizer.role) ? next() : reject(res, 403, "Droits insuffisants.");
}
function requireCsrf(req, res, next) {
  const expected = csrfFor(req.sessionToken);
  if (!safeEqual(req.get("x-csrf-token"), expected)) return reject(res, 403, "Jeton de securite absent ou invalide.");
  next();
}
app.get("/api/admin/session", loadOrganizer, (req, res) => {
  res.json({ user: { email: req.organizer.email, role: req.organizer.role }, csrfToken: csrfFor(req.sessionToken), expiresAt: req.organizer.expires_at });
});
app.post("/api/admin/logout", loadOrganizer, requireCsrf, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [sha256(req.sessionToken)]);
  res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
}));

app.get("/api/orders/:reference", asyncRoute(async (req, res) => {
  await sweepExpiredReservations();
  const reference = cleanText(req.params.reference, 64).toUpperCase();
  const result = await pool.query("SELECT * FROM orders WHERE reference = $1", [reference]);
  if (!result.rows[0]) return reject(res, 404, "Commande introuvable.");
  const order = await getOrderPayload(pool, result.rows[0]);
  if (result.rows[0].status === "reserved") {
    const account = paymentConfig(result.rows[0].payment_method);
    order.paymentInstructions = {
      method: result.rows[0].payment_method,
      label: account?.label || "",
      number: account?.number || "",
      accountName: cleanText(process.env.PAYMENT_RECEIVER_NAME),
      expiresAt: result.rows[0].hold_until
    };
  }
  return res.json(order);
}));

app.post("/api/reservations", asyncRoute(async (req, res) => {
  const customer = req.body?.customer || {};
  const name = cleanText(customer.name, 120);
  const email = cleanText(customer.email, 254).toLowerCase();
  const phone = cleanText(customer.phone, 40);
  const method = req.body?.paymentMethod;
  const account = paymentConfig(method);
  const idempotencyKey = cleanText(req.get("idempotency-key"), 100);
  if (!name || !validEmail(email) || !phone) return reject(res, 400, "Nom, e-mail et telephone valides requis.");
  if (!account || !account.number) return reject(res, 503, "Ce mode de paiement n'est pas configure.");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(idempotencyKey)) return reject(res, 400, "Cle d'idempotence invalide.");
  if (!Array.isArray(req.body?.items) || req.body.items.length < 1 || req.body.items.length > 16) return reject(res, 400, "Panier invalide.");

  const normalized = new Map();
  for (const line of req.body.items) {
    const eventId = cleanText(line?.eventId, 80);
    const tierId = cleanText(line?.tierId, 80);
    const quantity = Number(line?.qty);
    if (!eventId || !tierId || !Number.isInteger(quantity) || quantity < 1 || quantity > 8) return reject(res, 400, "Quantite ou categorie invalide.");
    const key = `${eventId}\u0000${tierId}`;
    normalized.set(key, (normalized.get(key) || 0) + quantity);
  }
  if ([...normalized.values()].some((quantity) => quantity > 8)) return reject(res, 400, "Maximum de 8 billets par categorie.");

  const existing = await pool.query("SELECT * FROM orders WHERE idempotency_key = $1", [idempotencyKey]);
  if (existing.rows[0]) {
    if (existing.rows[0].customer_email !== email) return reject(res, 409, "Cle de commande deja utilisee.");
    const order = await getOrderPayload(pool, existing.rows[0]);
    const previousPayment = paymentConfig(existing.rows[0].payment_method);
    return res.status(200).json({ order, payment: { method: existing.rows[0].payment_method, ...previousPayment, accountName: cleanText(process.env.PAYMENT_RECEIVER_NAME), expiresAt: existing.rows[0].hold_until } });
  }

  const client = await pool.connect();
  let prooflessOrder;
  try {
    await client.query("BEGIN");
    await releaseExpiredReservations(client);
    const eventIds = [...new Set([...normalized.keys()].map((key) => key.split("\u0000")[0]))];
    const tierRows = await client.query(
      `SELECT e.id AS event_id, e.title AS event_title, e.starts_at, e.active,
              t.id AS tier_id, t.name AS tier_name, t.price_xof, t.capacity, t.sold_initial, t.sold, t.reserved
       FROM events e JOIN ticket_tiers t ON t.event_id = e.id
       WHERE e.id = ANY($1::text[]) ORDER BY e.id, t.id FOR UPDATE OF t`,
      [eventIds]
    );
    const byKey = new Map(tierRows.rows.map((row) => [`${row.event_id}\u0000${row.tier_id}`, row]));
    const lines = [];
    let subtotal = 0;
    for (const [key, quantity] of normalized.entries()) {
      const row = byKey.get(key);
      if (!row || !row.active || new Date(row.starts_at).getTime() <= Date.now()) throw Object.assign(new Error("Evenement ou categorie indisponible."), { status: 409 });
      const available = row.capacity - row.sold_initial - row.sold - row.reserved;
      if (quantity > available) throw Object.assign(new Error(`Stock insuffisant pour ${row.event_title} / ${row.tier_name}.`), { status: 409 });
      row.quantity = quantity;
      subtotal += Number(row.price_xof) * quantity;
      lines.push(row);
    }
    const fees = Math.max(0, xof(process.env.SERVICE_FEE_XOF)) * (lines.reduce((sum, line) => sum + line.quantity, 0) ? 1 : 0);
    const total = subtotal + fees;
    const orderId = randomUUID();
    const reference = randomRef();
    const holdUntil = new Date(Date.now() + reservationLifetimeMs);
    const inserted = await client.query(
      `INSERT INTO orders (id, reference, idempotency_key, customer_name, customer_email, customer_phone,
                           status, subtotal_xof, fees_xof, discount_xof, total_xof, payment_method, hold_until)
       VALUES ($1, $2, $3, $4, $5, $6, 'reserved', $7, $8, 0, $9, $10, $11) RETURNING *`,
      [orderId, reference, idempotencyKey, name, email, phone, subtotal, fees, total, method, holdUntil]
    );
    for (const line of lines) {
      await client.query("UPDATE ticket_tiers SET reserved = reserved + $3 WHERE event_id = $1 AND id = $2", [line.event_id, line.tier_id, line.quantity]);
      await client.query(
        `INSERT INTO order_items (order_id, event_id, tier_id, event_title, tier_name, quantity, unit_price_xof)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, line.event_id, line.tier_id, line.event_title, line.tier_name, line.quantity, line.price_xof]
      );
    }
    prooflessOrder = inserted.rows[0];
    await client.query("COMMIT");
    const fullOrder = await getOrderPayload(pool, prooflessOrder);

    // [ÉVOLUTION API DIRECTE - CRÉATION DE SESSION DE PAIEMENT] :
    // Lorsqu'une API Wave ou Orange Money est branchée :
    // 1. Appelez l'API Wave (ex: POST https://api.wave.com/v1/checkout/sessions) ou Orange Money WebPay
    //    avec { amount: total, currency: 'XOF', client_reference: reference, success_url, cancel_url }.
    // 2. Récupérez le 'checkout_url' ou 'wave_launch_url' renvoyé par l'API.
    // 3. Renvoyez { order: fullOrder, checkoutUrl } au client pour qu'il soit redirigé directement vers l'app de paiement.
    res.status(201).json({ order: fullOrder, payment: { method, ...account, accountName: cleanText(process.env.PAYMENT_RECEIVER_NAME), expiresAt: holdUntil } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505" && error.constraint === "orders_idempotency_key_key") {
      const duplicate = await pool.query("SELECT * FROM orders WHERE idempotency_key = $1", [idempotencyKey]);
      if (duplicate.rows[0]?.customer_email === email) {
        const previousPayment = paymentConfig(duplicate.rows[0].payment_method);
        return res.status(200).json({ order: await getOrderPayload(pool, duplicate.rows[0]), payment: { method: duplicate.rows[0].payment_method, ...previousPayment, accountName: cleanText(process.env.PAYMENT_RECEIVER_NAME), expiresAt: duplicate.rows[0].hold_until } });
      }
      return reject(res, 409, "Cle de commande deja utilisee.");
    }
    if (error.status) return reject(res, error.status, error.message);
    throw error;
  } finally {
    client.release();
  }
}));

// ==============================================================================
// [ÉVOLUTION API DIRECTE - RÉCEPTION AUTOMATIQUE DES PAIEMENTS VIA WEBHOOK]
// ==============================================================================
// Une fois les APIs Wave / Orange Money branchées, ce parcours manuel de preuve
// (upload JPEG ci-dessous) et de validation organisateur (route decision plus bas)
// sera remplacé par des webhooks automatiques :
//
// 1. Ajouter les routes d'écoute Webhook :
//    app.post("/api/webhooks/wave", express.raw({ type: "application/json" }), async (req, res) => {
//      // a) Vérifier la signature HMAC avec WAVE_WEBHOOK_SECRET
//      // b) Si type === "checkout.session.completed" :
//      //    - Récupérer event.data.client_reference (référence commande)
//      //    - Exécuter la transaction d'émission automatique des billets :
//      //      * UPDATE orders SET status = 'paid', transaction_reference = event.data.id
//      //      * UPDATE ticket_tiers SET reserved = reserved - qty, sold = sold + qty
//      //      * INSERT INTO tickets (codes uniques TGP-...)
//      // c) Retourner res.status(200).send("OK");
//    });
//
// 2. Faire de même pour Orange Money (WebPay IPN / Notification).
// Les billets sont alors disponibles immédiatement pour le client dès la confirmation de l'API.
// ==============================================================================

app.post("/api/orders/:reference/proof", proofUpload.single("proof"), asyncRoute(async (req, res) => {
  const reference = cleanText(req.params.reference, 64).toUpperCase();
  const transactionReference = cleanText(req.body?.transactionReference, 100);
  const file = req.file;
  if (!file || file.size < 4 || file.buffer[0] !== 0xff || file.buffer[1] !== 0xd8 || file.buffer[2] !== 0xff) return reject(res, 400, "Joignez une preuve JPEG valide.");
  if (transactionReference.length < 4) return reject(res, 400, "Reference de transaction invalide.");
  const privateKey = randomBytes(24).toString("hex");
  await mkdir(uploadDir, { recursive: true, mode: 0o700 });
  const filePath = path.join(uploadDir, privateKey + ".jpg");
  await writeFile(filePath, file.buffer, { flag: "wx", mode: 0o600 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const selected = await client.query("SELECT * FROM orders WHERE reference = $1 FOR UPDATE", [reference]);
    const order = selected.rows[0];
    if (!order) throw Object.assign(new Error("Commande introuvable."), { status: 404 });
    if (order.status !== "reserved" || new Date(order.hold_until).getTime() <= Date.now()) throw Object.assign(new Error("Reservation expiree ou deja traitee."), { status: 409 });
    const duplicate = await client.query("SELECT 1 FROM orders WHERE lower(transaction_reference) = lower($1) AND id <> $2", [transactionReference, order.id]);
    if (duplicate.rowCount) throw Object.assign(new Error("Cette reference de transaction est deja utilisee."), { status: 409 });
    await client.query("UPDATE orders SET status = 'pending_review', transaction_reference = $2, hold_until = $3 WHERE id = $1", [order.id, transactionReference, new Date(Date.now() + reviewHoldMs)]);
    await client.query("INSERT INTO payment_proofs (order_id, private_key, mime_type, size_bytes) VALUES ($1, $2, 'image/jpeg', $3)", [order.id, privateKey, file.size]);
    await client.query("COMMIT");
    const updated = (await pool.query("SELECT * FROM orders WHERE id = $1", [order.id])).rows[0];
    return res.status(201).json(await getOrderPayload(pool, updated));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    await unlink(filePath).catch(() => {});
    if (error.status) return reject(res, error.status, error.message);
    if (error.code === "23505") return reject(res, 409, "Cette preuve ou reference est deja associee a une commande.");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/admin/orders", loadOrganizer, requireRole("admin", "organizer"), asyncRoute(async (_req, res) => {
  const orders = await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
  const data = [];
  for (const row of orders.rows) {
    const order = await getOrderPayload(pool, row);
    const proof = await pool.query("SELECT submitted_at, size_bytes FROM payment_proofs WHERE order_id = $1", [row.id]);
    data.push({
      ...order,
      customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone },
      transactionReference: row.transaction_reference,
      proof: proof.rows[0] ? { url: `/api/admin/orders/${row.reference}/proof`, ...proof.rows[0] } : null
    });
  }
  res.json({ orders: data });
}));

app.get("/api/admin/orders/:reference/proof", loadOrganizer, requireRole("admin", "organizer"), asyncRoute(async (req, res) => {
  const result = await pool.query("SELECT p.private_key FROM payment_proofs p JOIN orders o ON o.id = p.order_id WHERE o.reference = $1", [cleanText(req.params.reference, 64).toUpperCase()]);
  if (!result.rows[0]) return reject(res, 404, "Justificatif introuvable.");
  res.type("image/jpeg").set("Cache-Control", "private, no-store").sendFile(path.join(uploadDir, result.rows[0].private_key + ".jpg"));
}));

app.post("/api/admin/orders/:reference/decision", loadOrganizer, requireRole("admin", "organizer"), requireCsrf, asyncRoute(async (req, res) => {
  const reference = cleanText(req.params.reference, 64).toUpperCase();
  const decision = req.body?.decision;
  const note = cleanText(req.body?.note, 500);
  if (!['approve', 'reject'].includes(decision)) return reject(res, 400, "Decision invalide.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const selected = await client.query("SELECT * FROM orders WHERE reference = $1 FOR UPDATE", [reference]);
    const order = selected.rows[0];
    if (!order || order.status !== "pending_review") throw Object.assign(new Error("Commande absente ou deja traitee."), { status: 409 });
    const proof = await client.query("SELECT 1 FROM payment_proofs WHERE order_id = $1", [order.id]);
    if (!proof.rowCount || !order.transaction_reference) throw Object.assign(new Error("Preuve de paiement manquante."), { status: 409 });
    const items = await client.query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id", [order.id]);
    for (const item of items.rows) {
      if (decision === "approve") {
        const update = await client.query(
          "UPDATE ticket_tiers SET reserved = reserved - $3, sold = sold + $3 WHERE event_id = $1 AND id = $2 AND reserved >= $3",
          [item.event_id, item.tier_id, item.quantity]
        );
        if (!update.rowCount) throw Object.assign(new Error("Reservation de stock incoherente."), { status: 409 });
        for (let i = 0; i < item.quantity; i++) {
          const code = "TGP-" + randomBytes(12).toString("hex").toUpperCase();
          await client.query("INSERT INTO tickets (id, order_id, item_id, code, holder_name) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), order.id, item.id, code, order.customer_name]);
        }
      } else {
        await client.query("UPDATE ticket_tiers SET reserved = GREATEST(0, reserved - $3) WHERE event_id = $1 AND id = $2", [item.event_id, item.tier_id, item.quantity]);
      }
    }
    const status = decision === "approve" ? "paid" : "rejected";
    const reviewNote = note || (decision === "approve" ? "Paiement verifie par l'organisateur." : "Paiement non valide.");
    await client.query("UPDATE orders SET status = $2, reviewed_at = now(), review_note = $3 WHERE id = $1", [order.id, status, reviewNote]);
    await audit(client, req.organizer.id, `order_${decision}`, "order", order.reference, { totalXof: order.total_xof });
    await client.query("COMMIT");
    const updated = (await pool.query("SELECT * FROM orders WHERE id = $1", [order.id])).rows[0];
    res.json({ order: await getOrderPayload(pool, updated) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.status) return reject(res, error.status, error.message);
    throw error;
  } finally { client.release(); }
}));

app.post("/api/admin/check-in", loadOrganizer, requireRole("admin", "organizer", "scanner"), requireCsrf, asyncRoute(async (req, res) => {
  const code = cleanText(req.body?.code, 64).toUpperCase().replace(/\s+/g, "");
  if (!code) return reject(res, 400, "Code billet requis.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT t.id, t.code, t.holder_name, t.checked_in_at, o.reference, o.status,
              oi.event_title, oi.tier_name
       FROM tickets t JOIN orders o ON o.id = t.order_id JOIN order_items oi ON oi.id = t.item_id
       WHERE t.code = $1 FOR UPDATE OF t`, [code]
    );
    if (!found.rows[0]) { await client.query("ROLLBACK"); return reject(res, 404, "Billet introuvable."); }
    const ticket = found.rows[0];
    if (ticket.status !== "paid") { await client.query("ROLLBACK"); return reject(res, 409, "Paiement non approuve."); }
    if (ticket.checked_in_at) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Billet deja utilise.", ticket }); }
    await client.query("UPDATE tickets SET checked_in_at = now() WHERE id = $1", [ticket.id]);
    await audit(client, req.organizer.id, "ticket_check_in", "ticket", ticket.code);
    await client.query("COMMIT");
    res.json({ ok: true, message: "Billet valide.", ticket: { ...ticket, checked_in_at: new Date().toISOString() } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}));

function normalizeEvent(input, id) {
  const title = cleanText(input?.title, 160);
  const category = cleanText(input?.category, 80);
  const date = dateValue(input?.date);
  const venueName = cleanText(input?.venue?.name, 160);
  const city = cleanText(input?.venue?.city || input?.city, 100);
  if (!title || !category || !date || !venueName || !city) throw Object.assign(new Error("Titre, categorie, date, lieu et ville sont requis."), { status: 400 });
  if (!Array.isArray(input?.tiers) || !input.tiers.length || input.tiers.length > 20) throw Object.assign(new Error("Ajoutez de 1 a 20 categories de billet."), { status: 400 });
  const ids = new Set();
  const tiers = input.tiers.map((tier, index) => {
    const tierId = cleanText(tier.id || `tier-${index + 1}`, 80);
    const name = cleanText(tier.name, 120);
    const price = Number(tier.price);
    const stock = Number(tier.stock);
    if (!tierId || ids.has(tierId) || !name || !Number.isSafeInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 1 || stock > 1000000) throw Object.assign(new Error("Categorie, prix ou stock invalide."), { status: 400 });
    ids.add(tierId);
    return { id: tierId, name, price, stock, perks: cleanText(tier.perks, 500) };
  });
  const publicData = { ...input };
  const image = cleanText(input.image, 900000);
  if (image.startsWith("data:")) {
    const match = image.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    const bytes = match ? Buffer.from(match[1], "base64") : Buffer.alloc(0);
    if (!match || image.length > 800000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw Object.assign(new Error("Affiche invalide ou superieure a la taille maximale."), { status: 400 });
  } else if (image && !/^https:\/\//i.test(image)) {
    throw Object.assign(new Error("L'affiche doit etre une image HTTPS ou un JPEG optimise."), { status: 400 });
  }
  publicData.image = image;
  delete publicData.tiers;
  delete publicData.id;
  delete publicData.visualEmoji;
  publicData.venue = { ...(input.venue || {}), name: venueName, city, address: cleanText(input.venue?.address, 240) };
  return { id, title, category, date, city, venueName, publicData, tiers };
}

async function saveEvent(req, res) {
  const suppliedId = cleanText(req.params.id || req.body?.id, 80);
  const generatedId = suppliedId || cleanText(req.body?.title, 80).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || randomUUID();
  let event;
  try { event = normalizeEvent(req.body, generatedId); }
  catch (error) { return reject(res, error.status || 400, error.message); }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM events WHERE id = $1 FOR UPDATE", [event.id]);
    await client.query(
      `INSERT INTO events (id, title, category, starts_at, city, venue_name, public_data, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category,
         starts_at = EXCLUDED.starts_at, city = EXCLUDED.city, venue_name = EXCLUDED.venue_name,
         public_data = EXCLUDED.public_data, active = TRUE, updated_at = now()`,
      [event.id, event.title, event.category, event.date, event.city, event.venueName, JSON.stringify(event.publicData)]
    );
    const present = new Set(event.tiers.map((tier) => tier.id));
    const old = await client.query("SELECT * FROM ticket_tiers WHERE event_id = $1 FOR UPDATE", [event.id]);
    for (const tier of old.rows) {
      const input = event.tiers.find((candidate) => candidate.id === tier.id);
      if (!input) {
        if (tier.sold_initial + tier.sold + tier.reserved > 0) throw Object.assign(new Error(`La categorie ${tier.name} a deja des ventes ou reservations et doit etre conservee.`), { status: 409 });
        await client.query("DELETE FROM ticket_tiers WHERE event_id = $1 AND id = $2", [event.id, tier.id]);
      } else {
        const minimum = tier.sold_initial + tier.sold + tier.reserved;
        if (input.stock < minimum) throw Object.assign(new Error(`Le stock de ${tier.name} ne peut pas passer sous ${minimum}.`), { status: 409 });
        await client.query("UPDATE ticket_tiers SET name = $3, price_xof = $4, capacity = $5, perks = $6 WHERE event_id = $1 AND id = $2", [event.id, tier.id, input.name, input.price, input.stock, input.perks]);
      }
    }
    for (const tier of event.tiers) {
      if (old.rows.some((row) => row.id === tier.id)) continue;
      await client.query("INSERT INTO ticket_tiers (event_id, id, name, price_xof, capacity, perks) VALUES ($1, $2, $3, $4, $5, $6)", [event.id, tier.id, tier.name, tier.price, tier.stock, tier.perks]);
    }
    await audit(client, req.organizer.id, "event_save", "event", event.id);
    await client.query("COMMIT");
    res.status(200).json({ event: { ...event.publicData, id: event.id, title: event.title, category: event.category, date: event.date, city: event.city, venue: event.publicData.venue, tiers: event.tiers } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.status) return reject(res, error.status, error.message);
    if (error.code === "23505") return reject(res, 409, "Identifiant d'evenement deja utilise.");
    throw error;
  } finally { client.release(); }
}
app.post("/api/admin/events", loadOrganizer, requireRole("admin", "organizer"), requireCsrf, asyncRoute(saveEvent));
app.put("/api/admin/events/:id", loadOrganizer, requireRole("admin", "organizer"), requireCsrf, asyncRoute(saveEvent));
app.delete("/api/admin/events/:id", loadOrganizer, requireRole("admin"), requireCsrf, asyncRoute(async (req, res) => {
  const id = cleanText(req.params.id, 80);
  const result = await pool.query("UPDATE events SET active = FALSE, updated_at = now() WHERE id = $1 AND active = TRUE RETURNING id", [id]);
  if (!result.rowCount) return reject(res, 404, "Evenement introuvable.");
  await pool.query("INSERT INTO audit_log (organizer_id, action, entity_type, entity_id) VALUES ($1, 'event_archive', 'event', $2)", [req.organizer.id, id]);
  res.status(204).end();
}));

app.use("/assets", express.static(path.join(root, "assets"), { dotfiles: "deny", immutable: production, maxAge: production ? "7d" : 0 }));
app.get("/", (_req, res) => res.sendFile(path.join(root, "index.html")));
app.get("/*splat", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/server/") || path.extname(req.path)) return next();
  res.sendFile(path.join(root, "index.html"));
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof multer.MulterError) return reject(res, error.code === "LIMIT_FILE_SIZE" ? 413 : 400, "Preuve invalide ou trop volumineuse.");
  if (error.message === "La preuve doit etre une image JPEG.") return reject(res, 400, error.message);
  console.error("TERANGAPASS request error:", error.message);
  res.status(500).json({ error: "Une erreur interne est survenue." });
});

await mkdir(uploadDir, { recursive: true, mode: 0o700 });
await initDatabase();
const reservationSweep = setInterval(() => {
  sweepExpiredReservations().catch((error) => console.error("Reservation cleanup failed:", error.message));
}, 60 * 1000);
reservationSweep.unref();
app.listen(port, "0.0.0.0", () => console.log(`TERANGAPASS API disponible sur le port ${port}`));
