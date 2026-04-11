"use strict";

const fs = require("fs");
const fsp = fs.promises;
const http = require("http");
const path = require("path");
const crypto = require("crypto");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "server-data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const LEGACY_DB_FILE = path.join(DATA_DIR, "applications.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SEO_FILE = path.join(DATA_DIR, "seo.json");
const BOT_CONFIG_FILE = path.join(DATA_DIR, "bot-config.json");

function loadDotEnvFile() {
  const filePath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const delimiter = trimmed.indexOf("=");
    if (delimiter <= 0) {
      return;
    }

    const key = trimmed.slice(0, delimiter).trim();
    const value = trimmed.slice(delimiter + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadDotEnvFile();

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MANAGER_LOGIN = process.env.MANAGER_LOGIN || "";
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || "";
const ADMIN_SESSION_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.ADMIN_SESSION_TTL_MS || 12 * 60 * 60 * 1000));
const USER_SESSION_TTL_MS = Math.max(30 * 60 * 1000, Number(process.env.USER_SESSION_TTL_MS || 14 * 24 * 60 * 60 * 1000));
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");

let botConfig = {
  token: (process.env.TELEGRAM_BOT_TOKEN || "").trim(),
  username: (process.env.TELEGRAM_BOT_USERNAME || "").trim().replace(/^@/, ""),
  webhookSecret: (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim(),
  adminChatIds: parseCsv(process.env.TELEGRAM_ADMIN_CHAT_IDS),
  managerChatIds: parseCsv(process.env.TELEGRAM_MANAGER_CHAT_IDS),
};
const EMAIL_WEBHOOK_URL = (process.env.EMAIL_WEBHOOK_URL || "").trim();

if (!ADMIN_LOGIN || !ADMIN_PASSWORD) {
  throw new Error("ADMIN_LOGIN and ADMIN_PASSWORD environment variables are required.");
}

const ADMIN_ACCOUNTS = [
  { id: "ADM-000001", login: ADMIN_LOGIN, password: ADMIN_PASSWORD, role: "admin" }
];

if (MANAGER_LOGIN && MANAGER_PASSWORD) {
  ADMIN_ACCOUNTS.push({ id: "ADM-000002", login: MANAGER_LOGIN, password: MANAGER_PASSWORD, role: "manager" });
}

const ROLE_RANK = {
  manager: 1,
  admin: 2
};

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_AUTH = 20;
const RATE_LIMIT_MAX_API = 120;
const rateLimitStore = new Map();

function getRateLimitKey(req, bucket = "api") {
  const forwarded = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwarded || req.socket?.remoteAddress || "unknown";
  return `${bucket}:${ip}`;
}

function checkRateLimit(req, bucket = "api") {
  const key = getRateLimitKey(req, bucket);
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry = { start: now, count: 0 };
    rateLimitStore.set(key, entry);
  }
  entry.count++;
  const max = bucket === "auth" ? RATE_LIMIT_MAX_AUTH : RATE_LIMIT_MAX_API;
  if (entry.count > max) {
    throw new HttpError(429, "Слишком много запросов. Попробуйте позже.");
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

const STATUS_ADMIN_ONLY = {
  request: new Set(["done", "rejected"]),
  order: new Set(["done", "rejected"]),
  return: new Set(["approved", "done", "rejected"])
};

const REQUEST_STATUS_META = {
  new: "Новая",
  in_progress: "В работе",
  postponed: "Отложена",
  done: "Обработана",
  rejected: "Отклонена"
};

const REQUEST_STATUS_TRANSITIONS = {
  new: new Set(["in_progress", "postponed", "rejected"]),
  in_progress: new Set(["postponed", "done", "rejected"]),
  postponed: new Set(["in_progress", "done", "rejected"]),
  done: new Set(),
  rejected: new Set()
};

const ORDER_STATUS_META = {
  new: "Новый",
  in_progress: "В работе",
  postponed: "Отложен",
  ready: "Готов к выдаче",
  done: "Завершен",
  rejected: "Отменен"
};

const ORDER_STATUS_TRANSITIONS = {
  new: new Set(["in_progress", "postponed", "rejected"]),
  in_progress: new Set(["ready", "postponed", "done", "rejected"]),
  postponed: new Set(["in_progress", "ready", "done", "rejected"]),
  ready: new Set(["postponed", "done", "rejected"]),
  done: new Set(),
  rejected: new Set()
};

const RETURN_STATUS_META = {
  new: "Новая",
  in_review: "На рассмотрении",
  approved: "Одобрена",
  done: "Завершена",
  rejected: "Отклонена"
};

const RETURN_STATUS_TRANSITIONS = {
  new: new Set(["in_review", "rejected"]),
  in_review: new Set(["approved", "rejected"]),
  approved: new Set(["done", "rejected"]),
  done: new Set(),
  rejected: new Set()
};

const LEGACY_TO_REQUEST_STATUS = {
  new: "new",
  in_progress: "in_progress",
  postponed: "postponed",
  done: "done",
  rejected: "rejected"
};

const REQUEST_TO_LEGACY_STATUS = {
  new: "new",
  in_progress: "in_progress",
  postponed: "postponed",
  done: "done",
  rejected: "rejected"
};

const REQUEST_TYPE_META = {
  repair: "Ремонт",
  parts_purchase: "Покупка деталей",
  return: "Возврат"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseCsv(value) {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function escapeAttrValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const SEO_DEFAULTS = {
  title: "", description: "", titleRepair: "", descriptionRepair: "",
  titleShop: "", descriptionShop: "", indexShop: true, favicon: "",
  yandexVerification: "", yandexMetrika: "", googleVerification: "", googleAnalytics: ""
};

async function readSeoData() {
  try {
    const raw = await fsp.readFile(SEO_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...SEO_DEFAULTS, ...parsed };
  } catch {
    return { ...SEO_DEFAULTS };
  }
}

async function writeSeoData(seo) {
  const safe = { ...SEO_DEFAULTS, ...seo };
  await fsp.writeFile(SEO_FILE, JSON.stringify(safe, null, 2), "utf8");
  return safe;
}

async function readBotConfig() {
  try {
    const raw = await fsp.readFile(BOT_CONFIG_FILE, "utf8");
    const saved = JSON.parse(raw);
    if (saved && typeof saved === "object") {
      if (saved.token !== undefined) botConfig.token = String(saved.token || "").trim();
      if (saved.username !== undefined) botConfig.username = String(saved.username || "").trim().replace(/^@/, "");
      if (saved.webhookSecret !== undefined) botConfig.webhookSecret = String(saved.webhookSecret || "").trim();
      if (Array.isArray(saved.adminChatIds)) botConfig.adminChatIds = saved.adminChatIds.map(String);
      if (Array.isArray(saved.managerChatIds)) botConfig.managerChatIds = saved.managerChatIds.map(String);
    }
  } catch {
    // no saved config, keep .env defaults
  }
}

async function writeBotConfig() {
  await fsp.writeFile(BOT_CONFIG_FILE, JSON.stringify({
    token: botConfig.token,
    username: botConfig.username,
    webhookSecret: botConfig.webhookSecret,
    adminChatIds: botConfig.adminChatIds,
    managerChatIds: botConfig.managerChatIds,
  }, null, 2), "utf8");
}

const ADMIN_HTML_PAGES = new Set(["admin.html", "admin-login.html"]);
const SEO_AWARE_PAGES = new Set(["index.html", "shop.html", "account.html", "about.html", "privacy.html", "return.html"]);

function injectSeoIntoHtml(html, baseName, seo) {
  if (!seo) {
    return html;
  }
  const isShop = baseName === "shop.html";
  const isRepair = baseName === "index.html";
  const isPublic = SEO_AWARE_PAGES.has(baseName);

  const newTitle = (isShop && seo.titleShop) || (isRepair && seo.titleRepair) || seo.title || "";
  const newDesc = (isShop && seo.descriptionShop) || (isRepair && seo.descriptionRepair) || seo.description || "";

  if (newTitle) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttrValue(newTitle)}</title>`);
  }
  if (newDesc) {
    html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeAttrValue(newDesc)}">`);
  }

  if (!isPublic) {
    return html;
  }

  const injections = [];

  if (seo.favicon) {
    injections.push(`<link rel="icon" href="${escapeAttrValue(seo.favicon)}">`);
  }
  if (seo.yandexVerification) {
    injections.push(`<meta name="yandex-verification" content="${escapeAttrValue(seo.yandexVerification)}">`);
  }
  if (seo.googleVerification) {
    injections.push(`<meta name="google-site-verification" content="${escapeAttrValue(seo.googleVerification)}">`);
  }
  if (isShop && seo.indexShop === false) {
    injections.push(`<meta name="robots" content="noindex, nofollow">`);
  }
  if (seo.yandexMetrika) {
    injections.push(`<script>${seo.yandexMetrika}</script>`);
  }
  if (seo.googleAnalytics) {
    injections.push(`<script>${seo.googleAnalytics}</script>`);
  }

  if (injections.length) {
    html = html.replace("</head>", `${injections.join("\n")}\n</head>`);
  }

  return html;
}

function sanitizeBrokenText(value, maxLength, fallback = "") {
  const text = cleanText(value, maxLength).replace(/\uFFFD+/g, "").trim();
  if (!text) {
    return fallback;
  }
  const probe = text.replace(/[?\s.,;:!'"()\-–—]+/g, "");
  if (!probe) {
    return fallback;
  }
  return text;
}

function normalizeEmail(value) {
  return cleanText(value, 120).toLowerCase();
}

function normalizePhone(value) {
  const raw = cleanText(value, 60);
  if (!raw) {
    return "";
  }
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }
  return hasPlus ? `+${digits}` : digits;
}

function normalizeTelegramUsername(value) {
  const raw = cleanText(value, 80).replace(/\s+/g, "");
  if (!raw) {
    return "";
  }
  const username = raw.replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) {
    return "";
  }
  return `@${username}`;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return num;
}

function makeNumericId(prefix, value) {
  return `${prefix}-${String(value).padStart(6, "0")}`;
}

function randomToken(prefix) {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

function randomCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

function hashPassword(password) {
  const safe = String(password || "");
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120_000;
  const digest = crypto.pbkdf2Sync(safe, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${digest}`;
}

function verifyPassword(password, stored) {
  const safe = String(stored || "");
  const parts = safe.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const digest = parts[3];
  if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !digest) {
    return false;
  }
  const computed = crypto.pbkdf2Sync(String(password || ""), salt, iterations, 32, "sha256").toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(digest, "hex"));
  } catch {
    return false;
  }
}

function parseBasicAuth(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) {
    return null;
  }
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) {
      return null;
    }
    return {
      login: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

function parseBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

function resolveAllowedOrigin(req) {
  const origin = (req?.headers?.origin || "").trim();
  if (!origin) {
    return APP_BASE_URL || "*";
  }
  const baseHost = APP_BASE_URL ? new URL(APP_BASE_URL).host : "";
  try {
    const reqHost = new URL(origin).host;
    if (baseHost && reqHost === baseHost) {
      return origin;
    }
  } catch {}
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin;
  }
  return APP_BASE_URL || origin;
}

function ensureApiHeaders(res, req) {
  const origin = req ? resolveAllowedOrigin(req) : (res._corsOrigin || APP_BASE_URL || "*");
  res._corsOrigin = origin;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Telegram-Bot-Api-Secret-Token");
  res.setHeader("Vary", "Origin");
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        reject(new HttpError(413, "Слишком большой запрос."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, "Некорректный JSON в теле запроса."));
      }
    });
    req.on("error", () => reject(new HttpError(400, "Не удалось прочитать тело запроса.")));
  });
}

function json(res, statusCode, payload) {
  ensureApiHeaders(res);
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
}

function createEmptyDatabase() {
  const createdAt = nowIso();
  return {
    meta: {
      version: 2,
      createdAt,
      updatedAt: createdAt
    },
    counters: {
      user: 0,
      request: 0,
      order: 0,
      return: 0,
      notification: 0
    },
    users: [],
    requests: [],
    orders: [],
    returns: [],
    telegramLinkCodes: [],
    notifications: []
  };
}

function isRoleAllowed(role, requiredRole = "manager") {
  const current = ROLE_RANK[role] || 0;
  const required = ROLE_RANK[requiredRole] || 0;
  return current >= required;
}

function normalizeOrder(rawOrder) {
  if (!rawOrder || typeof rawOrder !== "object") {
    return {
      totalQty: 0,
      totalPrice: 0,
      items: []
    };
  }

  const items = Array.isArray(rawOrder.items)
    ? rawOrder.items
        .map((item) => {
          const id = cleanText(item?.id, 80);
          const name = cleanText(item?.name, 240);
          const qty = Math.max(0, Math.floor(toNumber(item?.qty, 0)));
          const unitPrice = Math.max(0, Math.round(toNumber(item?.unitPrice, 0)));
          if (!name || qty <= 0) {
            return null;
          }
          return { id, name, qty, unitPrice };
        })
        .filter(Boolean)
    : [];

  const fallbackQty = items.reduce((sum, item) => sum + item.qty, 0);
  const fallbackTotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  return {
    totalQty: Math.max(0, Math.floor(toNumber(rawOrder.totalQty, fallbackQty))),
    totalPrice: Math.max(0, Math.round(toNumber(rawOrder.totalPrice, fallbackTotal))),
    items
  };
}

function normalizeDetails(rawDetails) {
  const details = rawDetails && typeof rawDetails === "object" ? rawDetails : {};
  const calculator = details.calculator && typeof details.calculator === "object" ? details.calculator : {};
  const delivery = details.delivery && typeof details.delivery === "object" ? details.delivery : {};
  const deliveryMode = cleanText(delivery.mode, 40).toLowerCase() === "other_city" ? "other_city" : "local";

  return {
    calculator: {
      device: cleanText(calculator.device, 120),
      model: cleanText(calculator.model, 120),
      service: cleanText(calculator.service, 120),
      urgency: cleanText(calculator.urgency, 120)
    },
    priceRange: cleanText(details.priceRange, 160),
    telegram: normalizeTelegramUsername(details.telegram),
    delivery: {
      mode: deliveryMode,
      city: cleanText(delivery.city, 120)
    },
    order: normalizeOrder(details.order)
  };
}

function normalizeClient(rawClient) {
  const client = rawClient && typeof rawClient === "object" ? rawClient : {};

  const normalized = {
    fullName: cleanText(client.fullName, 160),
    phone: cleanText(client.phone, 60),
    email: cleanText(client.email, 120),
    branch: cleanText(client.branch, 180),
    comment: cleanText(client.comment, 3000)
  };

  if (!normalized.fullName || !normalized.phone || !normalized.email || !normalized.branch) {
    throw new HttpError(400, "Заполните обязательные поля: ФИО, телефон, почта, филиал.");
  }

  return normalized;
}

function resolveCityFromBranch(branch) {
  const safe = cleanText(branch, 180);
  if (!safe) {
    return "";
  }
  const comma = safe.indexOf(",");
  return comma > 0 ? safe.slice(0, comma).trim() : safe;
}

function buildStatusEvent({
  fromStatus,
  toStatus,
  changedByRole,
  changedById,
  changedByName,
  comment = "",
  city = ""
}) {
  return {
    id: crypto.randomBytes(8).toString("hex"),
    fromStatus: fromStatus || "",
    toStatus: toStatus || "",
    changedAt: nowIso(),
    changedByRole: cleanText(changedByRole, 32) || "system",
    changedById: cleanText(changedById, 80),
    changedByName: cleanText(changedByName, 120),
    comment: cleanText(comment, 1200),
    city: cleanText(city, 120)
  };
}

function sanitizeLegacyStatus(rawStatus) {
  const key = cleanText(rawStatus, 40);
  return LEGACY_TO_REQUEST_STATUS[key] || "new";
}

function requestStatusLabel(status) {
  return REQUEST_STATUS_META[status] || status;
}

function orderStatusLabel(status) {
  return ORDER_STATUS_META[status] || status;
}

function returnStatusLabel(status) {
  return RETURN_STATUS_META[status] || status;
}

function toLegacyRequestStatus(status) {
  return REQUEST_TO_LEGACY_STATUS[status] || "new";
}

function toLegacyHistoryItem(event) {
  const status = toLegacyRequestStatus(event?.toStatus || "");
  return {
    status,
    label: REQUEST_STATUS_META[event?.toStatus] || REQUEST_STATUS_META.new,
    at: event?.changedAt || nowIso(),
    by: event?.changedByRole === "client" ? "client" : "admin",
    note: cleanText(event?.comment, 600)
  };
}

function requestTypeFromSource(source) {
  if (source === "shop_checkout" || source === "shop_request") {
    return "parts_purchase";
  }
  if (source === "return_request") {
    return "return";
  }
  return "repair";
}

function ensureRoleCanSetStatus({ role, entityType, nextStatus }) {
  if (role === "admin") {
    return;
  }
  const restricted = STATUS_ADMIN_ONLY[entityType] || new Set();
  if (restricted.has(nextStatus)) {
    throw new HttpError(403, "Недостаточно прав для установки этого статуса. Требуется роль admin.");
  }
}

function ensureDatabaseShape(rawDb) {
  const db = rawDb && typeof rawDb === "object" ? rawDb : createEmptyDatabase();

  db.meta = db.meta && typeof db.meta === "object" ? db.meta : {};
  db.meta.version = Number.isFinite(Number(db.meta.version)) ? Number(db.meta.version) : 2;
  db.meta.createdAt = db.meta.createdAt || nowIso();
  db.meta.updatedAt = db.meta.updatedAt || nowIso();

  db.counters = db.counters && typeof db.counters === "object" ? db.counters : {};
  db.counters.user = Math.max(0, Math.floor(toNumber(db.counters.user, 0)));
  db.counters.request = Math.max(0, Math.floor(toNumber(db.counters.request, 0)));
  db.counters.order = Math.max(0, Math.floor(toNumber(db.counters.order, 0)));
  db.counters.return = Math.max(0, Math.floor(toNumber(db.counters.return, 0)));
  db.counters.notification = Math.max(0, Math.floor(toNumber(db.counters.notification, 0)));

  db.users = Array.isArray(db.users) ? db.users : [];
  db.requests = Array.isArray(db.requests) ? db.requests : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.returns = Array.isArray(db.returns) ? db.returns : [];
  db.telegramLinkCodes = Array.isArray(db.telegramLinkCodes) ? db.telegramLinkCodes : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];

  return db;
}

function extractNumericSuffix(id) {
  const match = String(id || "").match(/-(\d+)$/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) || 0;
}

function migrateLegacyDatabase(rawLegacy) {
  const db = createEmptyDatabase();
  const applications = Array.isArray(rawLegacy?.applications) ? rawLegacy.applications : [];

  const usersByEmail = new Map();
  const usersByPhone = new Map();

  function upsertLegacyUser(client) {
    const emailNorm = normalizeEmail(client.email);
    const phoneNorm = normalizePhone(client.phone);
    let user = null;

    if (emailNorm && usersByEmail.has(emailNorm)) {
      user = usersByEmail.get(emailNorm);
    } else if (phoneNorm && usersByPhone.has(phoneNorm)) {
      user = usersByPhone.get(phoneNorm);
    }

    if (!user) {
      db.counters.user += 1;
      user = {
        id: makeNumericId("USR", db.counters.user),
        role: "customer",
        fullName: cleanText(client.fullName, 160),
        email: cleanText(client.email, 120),
        emailNorm,
        phone: cleanText(client.phone, 60),
        phoneNorm,
        city: resolveCityFromBranch(client.branch),
        telegramUsername: "",
        telegram: null,
        passwordHash: hashPassword(randomToken("pwd")),
        isAutoCreated: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastActivityAt: nowIso()
      };
      db.users.push(user);
      if (emailNorm) {
        usersByEmail.set(emailNorm, user);
      }
      if (phoneNorm) {
        usersByPhone.set(phoneNorm, user);
      }
    } else {
      if (!user.fullName && client.fullName) {
        user.fullName = cleanText(client.fullName, 160);
      }
      if (!user.email && client.email) {
        user.email = cleanText(client.email, 120);
        user.emailNorm = normalizeEmail(client.email);
      }
      if (!user.phone && client.phone) {
        user.phone = cleanText(client.phone, 60);
        user.phoneNorm = normalizePhone(client.phone);
      }
      user.updatedAt = nowIso();
    }

    return user;
  }

  applications.forEach((application) => {
    const client = normalizeClient(application.client || {});
    const details = normalizeDetails(application.details || {});
    const user = upsertLegacyUser(client);
    const source = cleanText(application.source, 80) || "repair_form";
    const requestStatus = sanitizeLegacyStatus(application.status);
    const historySource = Array.isArray(application.history) ? application.history : [];
    const city = resolveCityFromBranch(client.branch);

    const statusHistory = historySource.length
      ? historySource.map((entry, index) => {
          const toStatus = sanitizeLegacyStatus(entry?.status || requestStatus);
          const prev = index > 0 ? sanitizeLegacyStatus(historySource[index - 1]?.status || toStatus) : "";
          return {
            id: crypto.randomBytes(8).toString("hex"),
            fromStatus: prev,
            toStatus,
            changedAt: entry?.at || application.updatedAt || application.createdAt || nowIso(),
            changedByRole: entry?.by === "client" ? "client" : "admin",
            changedById: entry?.by === "client" ? user.id : "legacy-admin",
            changedByName: entry?.by === "client" ? "Клиент" : "Администратор",
            comment: cleanText(entry?.note, 1200),
            city
          };
        })
      : [
          buildStatusEvent({
            fromStatus: "",
            toStatus: requestStatus,
            changedByRole: "client",
            changedById: user.id,
            changedByName: "Клиент",
            comment: "Заявка создана через сайт",
            city
          })
        ];

    const fallbackRequestId = makeNumericId("APP", db.counters.request + 1);
    const requestId = cleanText(application.id, 40) || fallbackRequestId;
    db.counters.request = Math.max(db.counters.request + 1, extractNumericSuffix(requestId));

    const request = {
      id: requestId,
      type: requestTypeFromSource(source),
      source,
      userId: user.id,
      city,
      client,
      details,
      status: requestStatus,
      statusLabel: requestStatusLabel(requestStatus),
      managerComment: "",
      createdAt: application.createdAt || nowIso(),
      updatedAt: application.updatedAt || application.createdAt || nowIso(),
      statusHistory
    };

    db.requests.push(request);
  });

  db.requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return db;
}

async function ensureDatabase() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });

  if (fs.existsSync(DB_FILE)) {
    return;
  }

  if (fs.existsSync(LEGACY_DB_FILE)) {
    try {
      const legacyRaw = await fsp.readFile(LEGACY_DB_FILE, "utf8");
      const legacy = JSON.parse(legacyRaw);
      const migrated = migrateLegacyDatabase(legacy);
      await fsp.writeFile(DB_FILE, JSON.stringify(migrated, null, 2), "utf8");
      return;
    } catch {
      // continue with empty db
    }
  }

  const empty = createEmptyDatabase();
  await fsp.writeFile(DB_FILE, JSON.stringify(empty, null, 2), "utf8");
}

async function readDatabase() {
  await ensureDatabase();
  try {
    const raw = await fsp.readFile(DB_FILE, "utf8");
    return ensureDatabaseShape(JSON.parse(raw));
  } catch {
    return createEmptyDatabase();
  }
}

async function writeDatabase(db) {
  const safe = ensureDatabaseShape(db);
  safe.meta.updatedAt = nowIso();
  await fsp.writeFile(DB_FILE, JSON.stringify(safe, null, 2), "utf8");
}

let dbWriteQueue = Promise.resolve();
const adminSessions = new Map();
const userSessions = new Map();

function mutateDatabase(mutator) {
  dbWriteQueue = dbWriteQueue
    .catch(() => null)
    .then(async () => {
      const db = await readDatabase();
      const outcome = await mutator(db);
      const nextDb = outcome && typeof outcome === "object" && outcome.db ? outcome.db : db;
      await writeDatabase(nextDb);
      return outcome;
    });
  return dbWriteQueue;
}

function purgeExpiredSessions(map) {
  const now = Date.now();
  for (const [token, session] of map.entries()) {
    if (!session || session.expiresAt <= now) {
      map.delete(token);
    }
  }
}

function createAdminSession(account) {
  purgeExpiredSessions(adminSessions);
  const token = randomToken("adm");
  const now = Date.now();
  const session = {
    token,
    id: account.id,
    login: account.login,
    role: account.role,
    createdAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_MS
  };
  adminSessions.set(token, session);
  return session;
}

function resolveAdminSession(req) {
  purgeExpiredSessions(adminSessions);
  const bearer = parseBearerToken(req);
  if (bearer && bearer.startsWith("adm_")) {
    const session = adminSessions.get(bearer);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
  }

  const basic = parseBasicAuth(req);
  if (!basic) {
    return null;
  }
  const account = ADMIN_ACCOUNTS.find((item) => item.login === basic.login && item.password === basic.password) || null;
  if (!account) {
    return null;
  }
  return createAdminSession(account);
}

function requireAdminSession(req, requiredRole = "manager") {
  const session = resolveAdminSession(req);
  if (!session) {
    throw new HttpError(401, "Доступ только для администратора.");
  }
  if (!isRoleAllowed(session.role, requiredRole)) {
    throw new HttpError(403, "Недостаточно прав для выполнения операции.");
  }
  return session;
}

function createUserSession(user) {
  purgeExpiredSessions(userSessions);
  const token = randomToken("usr");
  const now = Date.now();
  const session = {
    token,
    userId: user.id,
    createdAt: now,
    expiresAt: now + USER_SESSION_TTL_MS
  };
  userSessions.set(token, session);
  return session;
}

function resolveUserSession(req) {
  purgeExpiredSessions(userSessions);
  const bearer = parseBearerToken(req);
  if (!bearer || !bearer.startsWith("usr_")) {
    return null;
  }
  const session = userSessions.get(bearer);
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }
  return session;
}

function requireUserSession(req, db) {
  const session = resolveUserSession(req);
  if (!session) {
    throw new HttpError(401, "Требуется авторизация пользователя.");
  }
  const user = db.users.find((item) => item.id === session.userId) || null;
  if (!user) {
    userSessions.delete(session.token);
    throw new HttpError(401, "Сессия пользователя не найдена.");
  }
  return { session, user };
}

function findUserByContact(db, emailNorm, phoneNorm) {
  if (emailNorm) {
    const byEmail = db.users.find((item) => item.emailNorm === emailNorm);
    if (byEmail) {
      return byEmail;
    }
  }
  if (phoneNorm) {
    const byPhone = db.users.find((item) => item.phoneNorm === phoneNorm);
    if (byPhone) {
      return byPhone;
    }
  }
  return null;
}

function touchUser(user) {
  user.updatedAt = nowIso();
  user.lastActivityAt = nowIso();
}

function createCustomerUser(db, payload, options = {}) {
  const fullName = cleanText(payload.fullName, 160);
  const email = cleanText(payload.email, 120);
  const phone = cleanText(payload.phone, 60);
  const city = cleanText(payload.city, 120);
  const emailNorm = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);

  if (!fullName) {
    throw new HttpError(400, "Укажите имя пользователя.");
  }
  if (!emailNorm && !phoneNorm) {
    throw new HttpError(400, "Нужен хотя бы email или телефон.");
  }

  const existing = findUserByContact(db, emailNorm, phoneNorm);
  if (existing && !options.allowExisting) {
    throw new HttpError(409, "Пользователь с таким email или телефоном уже существует.");
  }
  if (existing && options.allowExisting) {
    return existing;
  }

  db.counters.user += 1;
  const id = makeNumericId("USR", db.counters.user);
  const now = nowIso();
  const password = typeof payload.password === "string" && payload.password
    ? payload.password
    : randomToken("autopass").slice(0, 16);

  const user = {
    id,
    role: "customer",
    fullName,
    email,
    emailNorm,
    phone,
    phoneNorm,
    city,
    telegramUsername: normalizeTelegramUsername(payload.telegramUsername),
    telegram: null,
    passwordHash: hashPassword(password),
    isAutoCreated: Boolean(options.isAutoCreated),
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now
  };

  db.users.push(user);
  return user;
}

function upsertUserFromClient(db, client) {
  const emailNorm = normalizeEmail(client.email);
  const phoneNorm = normalizePhone(client.phone);
  let user = findUserByContact(db, emailNorm, phoneNorm);

  if (!user) {
    user = createCustomerUser(
      db,
      {
        fullName: client.fullName || "Клиент",
        email: client.email,
        phone: client.phone,
        city: resolveCityFromBranch(client.branch)
      },
      { allowExisting: true, isAutoCreated: true }
    );
  }

  if (!user.fullName && client.fullName) {
    user.fullName = cleanText(client.fullName, 160);
  }
  if (!user.email && client.email) {
    user.email = cleanText(client.email, 120);
    user.emailNorm = normalizeEmail(client.email);
  }
  if (!user.phone && client.phone) {
    user.phone = cleanText(client.phone, 60);
    user.phoneNorm = normalizePhone(client.phone);
  }
  if (!user.city && client.branch) {
    user.city = resolveCityFromBranch(client.branch);
  }
  touchUser(user);
  return user;
}

function createRequestRecord(db, payload, user, actor) {
  const source = cleanText(payload?.source, 80) || "repair_form";
  const client = normalizeClient(payload?.client);
  const details = normalizeDetails(payload?.details);
  if (source === "repair_form" && !details.calculator.model) {
    throw new HttpError(400, "Выберите модель устройства.");
  }
  const city = resolveCityFromBranch(client.branch);
  const type = requestTypeFromSource(source);

  db.counters.request += 1;
  const requestId = makeNumericId("APP", db.counters.request);
  const status = "new";
  const event = buildStatusEvent({
    fromStatus: "",
    toStatus: status,
    changedByRole: actor.role,
    changedById: actor.id,
    changedByName: actor.name,
    comment: "Заявка создана",
    city
  });

  const request = {
    id: requestId,
    type,
    source,
    userId: user.id,
    city,
    client: {
      fullName: client.fullName,
      phone: client.phone,
      email: client.email,
      branch: client.branch,
      comment: client.comment
    },
    details,
    status,
    statusLabel: requestStatusLabel(status),
    managerComment: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    statusHistory: [event]
  };

  db.requests.unshift(request);

  let order = null;
  if (source === "shop_checkout" && details.order.items.length) {
    db.counters.order += 1;
    const orderId = makeNumericId("ORD", db.counters.order);
    const orderEvent = buildStatusEvent({
      fromStatus: "",
      toStatus: "new",
      changedByRole: actor.role,
      changedById: actor.id,
      changedByName: actor.name,
      comment: "Заказ создан",
      city
    });

    order = {
      id: orderId,
      number: orderId,
      requestId: request.id,
      source: "shop_checkout",
      userId: user.id,
      city,
      status: "new",
      statusLabel: orderStatusLabel("new"),
      managerComment: "",
      totalQty: details.order.totalQty,
      totalPrice: details.order.totalPrice,
      items: details.order.items,
      summary: client.comment || "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      statusHistory: [orderEvent]
    };
    db.orders.unshift(order);
  }

  return { request, order };
}

function createReturnRecord(db, payload, user, actor) {
  const orderId = cleanText(payload?.orderId, 40);
  const reason = cleanText(payload?.reason, 180);
  const description = cleanText(payload?.description, 3000);
  if (!orderId) {
    throw new HttpError(400, "Нужно выбрать заказ для возврата.");
  }
  if (!reason) {
    throw new HttpError(400, "Укажите причину возврата.");
  }
  if (!description) {
    throw new HttpError(400, "Опишите проблему для возврата.");
  }

  const order = db.orders.find((item) => item.id === orderId && item.userId === user.id) || null;
  if (!order) {
    throw new HttpError(404, "Заказ для возврата не найден.");
  }

  db.counters.return += 1;
  const id = makeNumericId("RET", db.counters.return);
  const city = cleanText(order.city, 120);
  const event = buildStatusEvent({
    fromStatus: "",
    toStatus: "new",
    changedByRole: actor.role,
    changedById: actor.id,
    changedByName: actor.name,
    comment: "Заявка на возврат создана",
    city
  });

  const record = {
    id,
    type: "return",
    userId: user.id,
    orderId: order.id,
    city,
    reason,
    description,
    attachments: [],
    status: "new",
    statusLabel: returnStatusLabel("new"),
    managerComment: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    statusHistory: [event]
  };

  db.returns.unshift(record);
  return record;
}

function applyStatusChange({
  target,
  entityType,
  nextStatus,
  transitions,
  labelResolver,
  actor,
  comment = "",
  city = ""
}) {
  const status = cleanText(nextStatus, 40);
  if (!Object.hasOwn(transitions, status)) {
    throw new HttpError(400, "Некорректный статус.");
  }

  const current = cleanText(target.status, 40);
  const allowed = transitions[current] || new Set();
  const hasChanged = status !== current;
  if (hasChanged && !allowed.has(status)) {
    throw new HttpError(409, "Недопустимая смена статуса.");
  }
  if (hasChanged) {
    ensureRoleCanSetStatus({
      role: actor.role,
      entityType,
      nextStatus: status
    });
  }
  if (!hasChanged && !comment) {
    throw new HttpError(400, "Статус не изменился. Добавьте комментарий или выберите новый статус.");
  }

  const event = buildStatusEvent({
    fromStatus: current,
    toStatus: status,
    changedByRole: actor.role,
    changedById: actor.id,
    changedByName: actor.name,
    comment,
    city
  });

  target.status = status;
  target.statusLabel = labelResolver(status);
  if (comment) {
    target.managerComment = comment;
  }
  target.updatedAt = nowIso();
  target.statusHistory = Array.isArray(target.statusHistory) ? target.statusHistory : [];
  target.statusHistory.push(event);
  return target;
}

function createPublicUser(user, db) {
  if (!user) {
    return null;
  }

  const userRequests = db.requests.filter((item) => item.userId === user.id);
  const userOrders = db.orders.filter((item) => item.userId === user.id);
  const userReturns = db.returns.filter((item) => item.userId === user.id);
  const totalSpent = userOrders.reduce((sum, order) => sum + Math.max(0, toNumber(order.totalPrice, 0)), 0);
  const lastEntityActivity = [
    user.lastActivityAt || "",
    ...userRequests.map((item) => item.updatedAt || item.createdAt || ""),
    ...userOrders.map((item) => item.updatedAt || item.createdAt || ""),
    ...userReturns.map((item) => item.updatedAt || item.createdAt || "")
  ]
    .filter(Boolean)
    .sort()
    .pop() || user.createdAt;

  return {
    id: user.id,
    role: user.role || "customer",
    fullName: sanitizeBrokenText(user.fullName, 160, "Клиент"),
    email: user.email,
    phone: user.phone,
    city: sanitizeBrokenText(user.city, 120, ""),
    telegramUsername: user.telegramUsername || "",
    telegramLinked: Boolean(user.telegram?.chatId),
    telegram: user.telegram?.chatId
      ? {
          chatId: String(user.telegram.chatId),
          username: user.telegram.username || "",
          linkedAt: user.telegram.linkedAt || ""
        }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastActivityAt: lastEntityActivity,
    isAutoCreated: Boolean(user.isAutoCreated),
    stats: {
      ordersCount: userOrders.length,
      purchasesCount: userOrders.length,
      requestsCount: userRequests.length,
      returnsCount: userReturns.length,
      totalSpent
    }
  };
}

function toLegacyApplication(request) {
  const safeRequest = buildRequestView(request);
  const status = toLegacyRequestStatus(safeRequest.status);
  return {
    id: safeRequest.id,
    source: safeRequest.source,
    client: safeRequest.client || {},
    details: safeRequest.details || {},
    status,
    statusLabel: REQUEST_STATUS_META[safeRequest.status] || REQUEST_STATUS_META.new,
    createdAt: safeRequest.createdAt,
    updatedAt: safeRequest.updatedAt,
    history: (Array.isArray(safeRequest.statusHistory) ? safeRequest.statusHistory : []).map(toLegacyHistoryItem)
  };
}

function findRequestById(db, id) {
  return db.requests.find((item) => item.id === id) || null;
}

function findOrderById(db, id) {
  return db.orders.find((item) => item.id === id) || null;
}

function findReturnById(db, id) {
  return db.returns.find((item) => item.id === id) || null;
}

function directTelegramLink(user) {
  const normalized = normalizeTelegramUsername(user?.telegramUsername);
  const username = normalized.replace(/^@/, "");
  if (username) {
    return `https://t.me/${encodeURIComponent(username)}`;
  }
  if (user?.telegram?.chatId) {
    return `tg://user?id=${String(user.telegram.chatId)}`;
  }
  return "";
}

function normalizeAttachmentName(name, fallback = "file") {
  const base = String(name || fallback).replace(/[^\w.\-()]+/g, "_").slice(0, 80);
  return base || fallback;
}

const ALLOWED_UPLOAD_MIMES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"
]);

function extensionByMime(mime) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf"
  };
  return map[mime] || "";
}

function decodeAttachmentData(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return null;
  }
  const mime = match[1];
  const base64 = match[2].replace(/\s+/g, "");
  const buffer = Buffer.from(base64, "base64");
  return { mime, buffer };
}

async function saveReturnAttachments(returnId, attachments) {
  if (!Array.isArray(attachments) || !attachments.length) {
    return [];
  }

  const limited = attachments.slice(0, 3);
  const saved = [];
  let totalBytes = 0;

  for (let index = 0; index < limited.length; index += 1) {
    const item = limited[index];
    const decoded = decodeAttachmentData(item?.dataUrl);
    if (!decoded) {
      continue;
    }
    if (!ALLOWED_UPLOAD_MIMES.has(decoded.mime)) {
      throw new HttpError(400, `Недопустимый формат файла: ${decoded.mime}. Разрешены: JPG, PNG, WEBP, GIF, PDF.`);
    }

    const bytes = decoded.buffer.length;
    totalBytes += bytes;
    if (bytes > 2_500_000 || totalBytes > 7_000_000) {
      throw new HttpError(413, "Файлы слишком большие. Уменьшите размер вложений.");
    }

    const ext = extensionByMime(decoded.mime) || path.extname(String(item?.name || "")) || ".bin";
    const baseName = normalizeAttachmentName(item?.name, `file_${index + 1}`);
    const fileName = `${returnId}_${Date.now()}_${index + 1}_${baseName}${ext}`;
    const fullPath = path.join(UPLOADS_DIR, fileName);
    await fsp.writeFile(fullPath, decoded.buffer);

    saved.push({
      name: cleanText(item?.name, 160) || fileName,
      mime: decoded.mime,
      size: bytes,
      fileName
    });
  }

  return saved;
}

function collectAdminChatIds() {
  const unique = new Set();
  botConfig.adminChatIds.forEach((id) => unique.add(String(id)));
  botConfig.managerChatIds.forEach((id) => unique.add(String(id)));
  return Array.from(unique);
}

function resolveTelegramOperator(chatId) {
  const key = String(chatId || "");
  if (botConfig.adminChatIds.includes(key)) {
    return { role: "admin", id: `tg:${key}`, name: `Telegram admin ${key}` };
  }
  if (botConfig.managerChatIds.includes(key)) {
    return { role: "manager", id: `tg:${key}`, name: `Telegram manager ${key}` };
  }
  return null;
}

async function telegramApi(method, payload) {
  if (!botConfig.token) {
    return null;
  }
  const url = `https://api.telegram.org/bot${botConfig.token}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Telegram API ${method} failed: ${response.status} ${text}`);
  }
  return response.json().catch(() => ({}));
}

async function sendTelegramMessage(chatId, text, inlineKeyboard = null) {
  if (!botConfig.token || !chatId) {
    return;
  }
  const payload = {
    chat_id: chatId,
    text: cleanText(text, 3900)
  };
  if (inlineKeyboard) {
    payload.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  await telegramApi("sendMessage", payload);
}

async function sendEmailNotification(payload) {
  if (!EMAIL_WEBHOOK_URL) {
    return;
  }
  try {
    await fetch(EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // ignore email webhook errors
  }
}

function buildRequestView(request) {
  const sourceClient = request?.client && typeof request.client === "object" ? request.client : {};
  const sourceDetails = request?.details && typeof request.details === "object" ? request.details : {};
  const sourceOrder = sourceDetails.order && typeof sourceDetails.order === "object" ? sourceDetails.order : {};
  const sourceDelivery = sourceDetails.delivery && typeof sourceDetails.delivery === "object" ? sourceDetails.delivery : {};
  const safeOrderItems = Array.isArray(sourceOrder.items)
    ? sourceOrder.items.map((item) => ({
        ...item,
        name: sanitizeBrokenText(item?.name, 240, "Товар")
      }))
    : [];
  const client = {
    ...sourceClient,
    fullName: sanitizeBrokenText(sourceClient.fullName, 160, "Клиент"),
    branch: sanitizeBrokenText(sourceClient.branch, 180, ""),
    comment: sanitizeBrokenText(sourceClient.comment, 3000, "")
  };
  const details = {
    ...sourceDetails,
    telegram: sanitizeBrokenText(sourceDetails.telegram, 80, ""),
    delivery: {
      ...sourceDelivery,
      mode: sanitizeBrokenText(sourceDelivery.mode, 40, "local"),
      city: sanitizeBrokenText(sourceDelivery.city, 120, "")
    },
    order: {
      ...sourceOrder,
      items: safeOrderItems
    }
  };
  return {
    ...request,
    city: sanitizeBrokenText(request.city, 120, ""),
    client,
    details,
    statusLabel: requestStatusLabel(request.status),
    typeLabel: REQUEST_TYPE_META[request.type] || request.type
  };
}

function buildOrderView(order) {
  const safeItems = Array.isArray(order.items)
    ? order.items.map((item) => ({
        ...item,
        name: sanitizeBrokenText(item?.name, 240, "Товар")
      }))
    : [];
  return {
    ...order,
    city: sanitizeBrokenText(order.city, 120, ""),
    items: safeItems,
    statusLabel: orderStatusLabel(order.status),
    shortItems: safeItems.slice(0, 3).map((item) => `${item.name} × ${item.qty}`).join("; ")
  };
}

function buildReturnView(item) {
  return {
    ...item,
    city: sanitizeBrokenText(item.city, 120, ""),
    reason: sanitizeBrokenText(item.reason, 180, ""),
    description: sanitizeBrokenText(item.description, 3000, ""),
    statusLabel: returnStatusLabel(item.status)
  };
}

function filterBySearch(list, query, projector) {
  const safe = cleanText(query, 120).toLowerCase();
  if (!safe) {
    return list;
  }
  return list.filter((item) => {
    const hay = projector(item).toLowerCase();
    return hay.includes(safe);
  });
}

function mapEntityType(input) {
  if (input === "req" || input === "request") {
    return "request";
  }
  if (input === "ord" || input === "order") {
    return "order";
  }
  if (input === "ret" || input === "return") {
    return "return";
  }
  return "";
}

function formatTelegramDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ru-RU");
}

function sanitizeTelegramField(value, maxLength = 500, fallback = "—") {
  const safe = sanitizeBrokenText(value, maxLength, "");
  return safe || fallback;
}

function resolveRequestPriorityLabel(request) {
  const urgency = sanitizeBrokenText(request?.details?.calculator?.urgency, 80, "");
  if (!urgency) {
    return "Обычный";
  }
  const lowered = urgency.toLowerCase();
  if (/(сроч|urgent|high)/i.test(lowered)) {
    return "Высокий";
  }
  if (/(низк|low)/i.test(lowered)) {
    return "Низкий";
  }
  return urgency;
}

function resolveRequestTelegramUsername(request, user) {
  const fromRequest = normalizeTelegramUsername(request?.details?.telegram || "");
  if (fromRequest) {
    return fromRequest;
  }
  const fromProfile = normalizeTelegramUsername(user?.telegramUsername || "");
  if (fromProfile) {
    return fromProfile;
  }
  const fromLinked = normalizeTelegramUsername(user?.telegram?.username || "");
  if (fromLinked) {
    return fromLinked;
  }
  return "";
}

function statusMetaByEntityType(entityType) {
  if (entityType === "request") {
    return REQUEST_STATUS_META;
  }
  if (entityType === "order") {
    return ORDER_STATUS_META;
  }
  if (entityType === "return") {
    return RETURN_STATUS_META;
  }
  return {};
}

function statusTransitionsByEntityType(entityType) {
  if (entityType === "request") {
    return REQUEST_STATUS_TRANSITIONS;
  }
  if (entityType === "order") {
    return ORDER_STATUS_TRANSITIONS;
  }
  if (entityType === "return") {
    return RETURN_STATUS_TRANSITIONS;
  }
  return {};
}

function entityTypeShort(entityType) {
  if (entityType === "request") {
    return "req";
  }
  if (entityType === "order") {
    return "ord";
  }
  if (entityType === "return") {
    return "ret";
  }
  return "";
}

function entityTypeLabel(entityType) {
  if (entityType === "request") {
    return "заявки";
  }
  if (entityType === "order") {
    return "заказа";
  }
  if (entityType === "return") {
    return "возврата";
  }
  return "записи";
}

function resolveEntityByType(db, entityType, entityId) {
  if (entityType === "request") {
    return findRequestById(db, entityId);
  }
  if (entityType === "order") {
    return findOrderById(db, entityId);
  }
  if (entityType === "return") {
    return findReturnById(db, entityId);
  }
  return null;
}

function buildStatusMenuKeyboard(entityType, entityId, currentStatus = "", role = "manager") {
  const transitions = statusTransitionsByEntityType(entityType);
  const meta = statusMetaByEntityType(entityType);
  const short = entityTypeShort(entityType);
  const safeId = cleanText(entityId, 40);
  const safeCurrent = cleanText(currentStatus, 40);
  const restricted = STATUS_ADMIN_ONLY[entityType] || new Set();
  const allowed = Array.from(transitions[safeCurrent] || [])
    .filter((status) => role === "admin" || !restricted.has(status));

  const rows = [];
  for (let index = 0; index < allowed.length; index += 2) {
    const pair = allowed.slice(index, index + 2).map((status) => ({
      text: meta[status] || status,
      callback_data: `set|${short}|${safeId}|${status}`
    }));
    if (pair.length) {
      rows.push(pair);
    }
  }

  rows.push([{ text: "Комментарий", callback_data: `cmt|${short}|${safeId}` }]);
  return rows;
}

function buildEntitySyncKeyboard(entityType, entityId, telegramUsername = "") {
  const short = entityTypeShort(entityType);
  const safeId = cleanText(entityId, 40);
  const keyboard = [
    [{ text: "Изменить статус", callback_data: `menu|${short}|${safeId}|status` }],
    [{ text: "Комментарий", callback_data: `cmt|${short}|${safeId}` }]
  ];
  const username = normalizeTelegramUsername(telegramUsername);
  if (username) {
    keyboard.push([{ text: "Написать в ТГ", url: `https://t.me/${encodeURIComponent(username.replace(/^@/, ""))}` }]);
  }
  return keyboard;
}

function buildRequestStatusMenuKeyboard(requestId, currentStatus = "new", role = "manager") {
  return buildStatusMenuKeyboard("request", requestId, currentStatus, role);
}

async function notifyUserInTelegram(user, lines) {
  if (!user?.telegram?.chatId) {
    return;
  }
  const text = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
  await sendTelegramMessage(String(user.telegram.chatId), text).catch(() => null);
}

async function notifyUserInEmail(user, payload) {
  const email = cleanText(user?.email, 120);
  if (!email) {
    return;
  }
  await sendEmailNotification({
    ...(payload && typeof payload === "object" ? payload : {}),
    to: email,
    userId: user?.id || ""
  });
}

async function notifyUserChannels(user, lines, emailPayload = null) {
  await Promise.all([
    notifyUserInTelegram(user, lines),
    notifyUserInEmail(user, emailPayload)
  ]).catch(() => null);
}

async function notifyUserStatusChange(user, entityType, entity) {
  const mapping = {
    request: {
      title: "Статус заявки обновлен",
      statusLabel: requestStatusLabel(entity.status),
      id: entity.id
    },
    order: {
      title: "Статус заказа обновлен",
      statusLabel: orderStatusLabel(entity.status),
      id: entity.id
    },
    return: {
      title: "Статус возврата обновлен",
      statusLabel: returnStatusLabel(entity.status),
      id: entity.id
    }
  };
  const meta = mapping[entityType];
  if (!meta) {
    return;
  }
  const lines = [meta.title, `ID: ${meta.id}`, `Новый статус: ${meta.statusLabel}`];
  await notifyUserChannels(user, lines, {
    type: "user_status_changed",
    entityType,
    entityId: meta.id,
    status: entity.status,
    text: lines.join("\n")
  });
}

async function notifyAdminsAboutEntityStatusChange({
  entityType,
  entity,
  user = null,
  actor = null,
  source = "site"
}) {
  const chats = collectAdminChatIds();
  if (!chats.length || !entityType || !entity?.id) {
    return;
  }

  const meta = statusMetaByEntityType(entityType);
  const statusLabel = meta[entity.status] || entity.status || "—";
  const lastEvent = Array.isArray(entity.statusHistory) && entity.statusHistory.length
    ? entity.statusHistory[entity.statusHistory.length - 1]
    : null;
  const prevStatus = cleanText(lastEvent?.fromStatus, 40);
  const prevStatusLabel = prevStatus ? (meta[prevStatus] || prevStatus) : "—";
  const actorLabel = cleanText(actor?.name, 120) || cleanText(lastEvent?.changedByName, 120) || "Система";
  const actorRole = cleanText(actor?.role, 40) || cleanText(lastEvent?.changedByRole, 40) || "system";
  const note = sanitizeTelegramField(lastEvent?.comment, 500, "—");
  const clientName = sanitizeTelegramField(user?.fullName, 120, "—");
  const phoneLabel = sanitizeTelegramField(user?.phone, 60, "—");
  const telegramUsername = resolveRequestTelegramUsername(null, user);
  const sourceLabel = source === "telegram" ? "Telegram-бот" : "Сайт / админ-панель";

  const text = [
    "🔄 Синхронизация статуса",
    "",
    `Тип: ${entityTypeLabel(entityType)}`,
    `ID: ${entity.id}`,
    `Статус: ${statusLabel}`,
    `Было: ${prevStatusLabel}`,
    `Источник: ${sourceLabel}`,
    `Кто изменил: ${actorLabel} (${actorRole})`,
    `Время: ${formatTelegramDateTime(entity.updatedAt || lastEvent?.changedAt || nowIso())}`,
    "",
    "👤 Клиент",
    `Имя: ${clientName}`,
    `Телефон: ${phoneLabel}`,
    `Комментарий: ${note}`
  ].join("\n");

  const keyboard = buildEntitySyncKeyboard(entityType, entity.id, telegramUsername);
  await Promise.all(chats.map((chatId) => sendTelegramMessage(chatId, text, keyboard).catch(() => null)));
}

async function notifyAdminsAboutRequest(request, user, linkedOrder = null) {
  const chats = collectAdminChatIds();
  if (!chats.length) {
    return;
  }
  const clientName = sanitizeTelegramField(request.client?.fullName, 160, sanitizeTelegramField(user?.fullName, 160, "Клиент"));
  const cityLabel = sanitizeTelegramField(request.city, 120, sanitizeTelegramField(user?.city, 120, "—"));
  const typeLabel = sanitizeTelegramField(REQUEST_TYPE_META[request.type] || request.type, 80, "—");
  const telegramUsername = resolveRequestTelegramUsername(request, user);
  const telegramLabel = telegramUsername || "—";
  const phoneLabel = sanitizeTelegramField(request.client?.phone, 60, sanitizeTelegramField(user?.phone, 60, "—"));
  const emailLabel = sanitizeTelegramField(request.client?.email, 120, sanitizeTelegramField(user?.email, 120, "—"));
  const deviceLabel = sanitizeTelegramField(request.details?.calculator?.device, 120, "—");
  const modelLabel = sanitizeTelegramField(request.details?.calculator?.model, 120, "—");
  const problemDescription = sanitizeTelegramField(request.client?.comment, 1200, "—");
  const serviceLabel = sanitizeTelegramField(request.details?.calculator?.service, 120, "—");
  const urgencyLabel = sanitizeTelegramField(request.details?.calculator?.urgency, 120, "—");
  const priceRangeLabel = sanitizeTelegramField(request.details?.priceRange, 160, "—");
  const branchLabel = sanitizeTelegramField(request.client?.branch, 180, "—");
  const sourceLabel = sanitizeTelegramField(request.source, 80, "—");
  const createdAtLabel = formatTelegramDateTime(request.createdAt);
  const priorityLabel = resolveRequestPriorityLabel(request);
  const items = Array.isArray(request.details?.order?.items) ? request.details.order.items : [];
  const relatedItemsLines = items.length
    ? items.map((item) => `• ${sanitizeTelegramField(item?.name, 120, "Товар")} × ${Math.max(0, Math.floor(toNumber(item?.qty, 0)))}`)
    : ["• —"];
  const deliveryModeRaw = cleanText(request?.details?.delivery?.mode, 40).toLowerCase();
  const isDeliveryToOtherCity = deliveryModeRaw === "other_city";
  const deliveryModeLabel = isDeliveryToOtherCity ? "Доставка в другой город" : "Самовывоз / по городу";
  const deliveryCityLabel = sanitizeTelegramField(request?.details?.delivery?.city, 120, isDeliveryToOtherCity ? "Не указан" : "—");
  const orderRecordLabel = sanitizeTelegramField(linkedOrder?.id, 40, "—");

  const additionalLines = [
    `Услуга: ${serviceLabel}`,
    `Филиал: ${branchLabel}`,
    `Город: ${cityLabel}`,
    `Доставка: ${deliveryModeLabel}`,
    `Город получателя: ${deliveryCityLabel}`,
    `Источник: ${sourceLabel}`,
    `Оценка: ${priceRangeLabel}`
  ];

  const text = [
    "🆕 Новая заявка на сайте",
    "",
    "🟦 ЗАЯВКА",
    `Тип: ${typeLabel}`,
    `ID заявки: ${request.id}`,
    `Статус: ${requestStatusLabel(request.status)}`,
    `Приоритет: ${priorityLabel}`,
    `Дата создания: ${createdAtLabel}`,
    "",
    "🟩 КЛИЕНТ",
    `Имя: ${clientName}`,
    `Telegram username: ${telegramLabel}`,
    `Телефон: ${phoneLabel}`,
    `Email: ${emailLabel}`,
    "",
    "🟧 УСТРОЙСТВО И ПРОБЛЕМА",
    `Устройство: ${deviceLabel}`,
    `Модель: ${modelLabel}`,
    `Описание проблемы: ${problemDescription}`,
    "",
    "🟪 ДЕТАЛИ ЗАЯВКИ",
    ...additionalLines,
    "Связанные товары/позиции:",
    ...relatedItemsLines,
    `Номер заказа: ${orderRecordLabel}`
  ].join("\n");

  const keyboard = [
    [
      { text: "Принять в работу", callback_data: `set|req|${request.id}|in_progress` },
      { text: "Запросить уточнение", callback_data: `note|req|${request.id}|ask_info` }
    ],
    [
      { text: "Попросить фото", callback_data: `note|req|${request.id}|ask_photo` },
      { text: "Изменить статус", callback_data: `menu|req|${request.id}|status` }
    ],
    [{ text: "Оставить комментарий", callback_data: `cmt|req|${request.id}` }]
  ];

  if (telegramUsername) {
    keyboard.push([{ text: "Перейти в Telegram к пользователю", url: `https://t.me/${encodeURIComponent(telegramUsername.replace(/^@/, ""))}` }]);
  }

  await Promise.all(chats.map((chatId) => sendTelegramMessage(chatId, text, keyboard).catch(() => null)));
}

async function notifyAdminsAboutOrder(order, user, linkedRequest = null) {
  const chats = collectAdminChatIds();
  if (!chats.length) {
    return;
  }
  const clientName = sanitizeTelegramField(linkedRequest?.client?.fullName, 160, sanitizeTelegramField(user?.fullName, 160, "Клиент"));
  const phoneLabel = sanitizeTelegramField(linkedRequest?.client?.phone, 60, sanitizeTelegramField(user?.phone, 60, "—"));
  const emailLabel = sanitizeTelegramField(linkedRequest?.client?.email, 120, sanitizeTelegramField(user?.email, 120, "—"));
  const branchLabel = sanitizeTelegramField(linkedRequest?.client?.branch, 180, "—");
  const telegramUsername = resolveRequestTelegramUsername(linkedRequest, user);
  const telegramLabel = telegramUsername || "—";
  const deliveryMode = cleanText(linkedRequest?.details?.delivery?.mode, 40).toLowerCase() === "other_city" ? "other_city" : "local";
  const deliveryModeLabel = deliveryMode === "other_city" ? "Доставка в другой город" : "Самовывоз / по городу";
  const deliveryCityLabel = sanitizeTelegramField(linkedRequest?.details?.delivery?.city, 120, "—");
  const positionsLines = Array.isArray(order.items) && order.items.length
    ? order.items.map((item) => {
        const name = sanitizeTelegramField(item?.name, 180, "Товар");
        const qty = Math.max(0, Math.floor(toNumber(item?.qty, 0)));
        const unitPrice = Math.max(0, Math.round(toNumber(item?.unitPrice, 0)));
        return `• ${name} × ${qty} (${unitPrice} ₽)`;
      })
    : ["• —"];

  const text = [
    "🛒 Новый заказ из магазина",
    "",
    "🟦 ЗАКАЗ",
    `ID: ${order.id}`,
    `Дата: ${formatTelegramDateTime(order.createdAt)}`,
    `Статус: ${orderStatusLabel(order.status)}`,
    `Сумма: ${sanitizeTelegramField(order.totalPrice, 20, "0")} ₽`,
    "",
    "🟩 КЛИЕНТ",
    `Имя: ${clientName}`,
    `Телефон: ${phoneLabel}`,
    `Email: ${emailLabel}`,
    `Telegram: ${telegramLabel}`,
    `Удобный филиал: ${branchLabel}`,
    "",
    "🟧 ПОЗИЦИИ",
    ...positionsLines,
    "",
    "🟪 ДОСТАВКА",
    `Формат: ${deliveryModeLabel}`,
    `Город доставки: ${deliveryMode === "other_city" ? deliveryCityLabel : "—"}`
  ].join("\n");

  const keyboard = [
    [
      { text: "Одобрить заказ", callback_data: `set|ord|${order.id}|in_progress` },
      { text: "Отложить", callback_data: `set|ord|${order.id}|postponed` }
    ],
    [{ text: "Изменить статус", callback_data: `menu|ord|${order.id}|status` }],
    [{ text: "Комментарий", callback_data: `cmt|ord|${order.id}` }]
  ];
  if (telegramUsername) {
    keyboard.push([{ text: "Написать в ТГ", url: `https://t.me/${encodeURIComponent(telegramUsername.replace(/^@/, ""))}` }]);
  }
  await Promise.all(chats.map((chatId) => sendTelegramMessage(chatId, text, keyboard).catch(() => null)));
}

async function notifyAdminsAboutReturn(returnRecord, user) {
  const chats = collectAdminChatIds();
  if (!chats.length) {
    return;
  }
  const clientName = sanitizeTelegramField(user?.fullName, 160, "Клиент");
  const phoneLabel = sanitizeTelegramField(user?.phone, 60, "—");
  const telegramUsername = resolveRequestTelegramUsername(null, user);

  const text = [
    "↩️ Новая заявка на возврат",
    "",
    `ID: ${returnRecord.id}`,
    `Заказ: ${returnRecord.orderId}`,
    `Клиент: ${clientName}`,
    `Телефон: ${phoneLabel}`,
    `Причина: ${sanitizeTelegramField(returnRecord.reason, 200, "—")}`,
    `Статус: ${returnStatusLabel(returnRecord.status)}`
  ].join("\n");

  const keyboard = [
    [{ text: "Изменить статус", callback_data: `menu|ret|${returnRecord.id}|status` }],
    [{ text: "Комментарий", callback_data: `cmt|ret|${returnRecord.id}` }]
  ];
  if (telegramUsername) {
    keyboard.push([{ text: "Написать в ТГ", url: `https://t.me/${encodeURIComponent(telegramUsername.replace(/^@/, ""))}` }]);
  }
  await Promise.all(chats.map((chatId) => sendTelegramMessage(chatId, text, keyboard).catch(() => null)));
}

async function handleTelegramLinkCode(db, code, from) {
  const safeCode = cleanText(code, 20).toUpperCase();
  if (!safeCode) {
    throw new HttpError(400, "Код привязки не указан.");
  }

  const now = Date.now();
  const record = db.telegramLinkCodes.find((item) => item.code === safeCode && !item.usedAt) || null;
  if (!record) {
    throw new HttpError(404, "Код привязки не найден или уже использован.");
  }
  if (Number(record.expiresAt) <= now) {
    throw new HttpError(410, "Код привязки истек. Сгенерируйте новый код в профиле.");
  }

  const user = db.users.find((item) => item.id === record.userId) || null;
  if (!user) {
    throw new HttpError(404, "Пользователь для привязки не найден.");
  }

  const chatId = String(from?.id || "");
  if (!chatId) {
    throw new HttpError(400, "Не удалось определить Telegram chat id.");
  }

  const occupied = db.users.find((item) => String(item?.telegram?.chatId || "") === chatId && item.id !== user.id);
  if (occupied) {
    throw new HttpError(409, "Этот Telegram уже привязан к другому аккаунту сайта.");
  }

  const linkedUsername = cleanText(from?.username, 80).replace(/[^A-Za-z0-9_]/g, "").slice(0, 32);

  user.telegram = {
    chatId,
    username: linkedUsername && linkedUsername.length >= 5 ? linkedUsername : "",
    linkedAt: nowIso()
  };
  if (!user.telegramUsername && from?.username) {
    user.telegramUsername = normalizeTelegramUsername(from.username);
  }
  touchUser(user);
  record.usedAt = nowIso();
  record.usedByChatId = chatId;

  return user;
}

async function handleTelegramStatusCommand({ entityType, entityId, nextStatus, comment, operator }) {
  let result = null;
  await mutateDatabase((db) => {
    let user = null;
    if (entityType === "request") {
      const request = findRequestById(db, entityId);
      if (!request) {
        throw new HttpError(404, "Заявка не найдена.");
      }
      applyStatusChange({
        target: request,
        entityType: "request",
        nextStatus: nextStatus || request.status,
        transitions: REQUEST_STATUS_TRANSITIONS,
        labelResolver: requestStatusLabel,
        actor: operator,
        comment,
        city: request.city
      });
      user = db.users.find((item) => item.id === request.userId) || null;
      result = { kind: "request", entity: request, user };
      return db;
    }
    if (entityType === "order") {
      const order = findOrderById(db, entityId);
      if (!order) {
        throw new HttpError(404, "Заказ не найден.");
      }
      applyStatusChange({
        target: order,
        entityType: "order",
        nextStatus: nextStatus || order.status,
        transitions: ORDER_STATUS_TRANSITIONS,
        labelResolver: orderStatusLabel,
        actor: operator,
        comment,
        city: order.city
      });
      user = db.users.find((item) => item.id === order.userId) || null;
      result = { kind: "order", entity: order, user };
      return db;
    }
    if (entityType === "return") {
      const returnRecord = findReturnById(db, entityId);
      if (!returnRecord) {
        throw new HttpError(404, "Возврат не найден.");
      }
      applyStatusChange({
        target: returnRecord,
        entityType: "return",
        nextStatus: nextStatus || returnRecord.status,
        transitions: RETURN_STATUS_TRANSITIONS,
        labelResolver: returnStatusLabel,
        actor: operator,
        comment,
        city: returnRecord.city
      });
      user = db.users.find((item) => item.id === returnRecord.userId) || null;
      result = { kind: "return", entity: returnRecord, user };
      return db;
    }
    throw new HttpError(400, "Неизвестный тип сущности.");
  });

  return result;
}

async function handleTelegramUpdate(update) {
  if (!update || typeof update !== "object") {
    return;
  }

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = String(callback?.message?.chat?.id || callback?.from?.id || "");
    const operatorId = String(callback?.from?.id || callback?.message?.chat?.id || "");
    const operator = resolveTelegramOperator(operatorId);

    if (!operator) {
      await sendTelegramMessage(chatId, "Недостаточно прав для управляющих действий.").catch(() => null);
      return;
    }

    const data = cleanText(callback.data, 120);
    const [kind, rawType, rawId, rawStatus] = data.split("|");
    const entityType = mapEntityType(rawType);

    if (kind === "menu" && entityType && rawId && rawStatus === "status") {
      const safeId = cleanText(rawId, 40);
      try {
        const db = await readDatabase();
        const entity = resolveEntityByType(db, entityType, safeId);
        if (!entity) {
          throw new HttpError(404, "Запись не найдена.");
        }
        const keyboard = buildStatusMenuKeyboard(entityType, safeId, entity.status, operator.role);
        await sendTelegramMessage(chatId, `Выберите новый статус для ${entityTypeLabel(entityType)} ${safeId}:`, keyboard).catch(() => null);
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Меню статусов открыто"
        }).catch(() => null);
      } catch (error) {
        await sendTelegramMessage(chatId, error instanceof Error ? error.message : "Не удалось открыть меню статусов.").catch(() => null);
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Ошибка"
        }).catch(() => null);
      }
      return;
    }

    if (kind === "note" && entityType && rawId && rawStatus) {
      const noteMap = {
        ask_info: {
          adminComment: "Запрошено уточнение у клиента через Telegram-бот",
          doneMessage: "Отметка «запросить уточнение» сохранена.",
          userLines: (id) => [
            `По заявке ${id} нужно уточнение деталей.`,
            "Пожалуйста, ответьте на сообщение менеджера или уточните детали в личном кабинете."
          ],
          userEmailType: "user_request_info_requested"
        },
        ask_photo: {
          adminComment: "Запрошены фото от клиента через Telegram-бот",
          doneMessage: "Отметка «попросить фото» сохранена.",
          userLines: (id) => [
            `По заявке ${id} нужны фото/видео проблемы.`,
            "Пожалуйста, отправьте материалы менеджеру или загрузите их в обращение."
          ],
          userEmailType: "user_request_photo_requested"
        }
      };
      const noteCfg = noteMap[cleanText(rawStatus, 40)];
      if (!noteCfg) {
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Действие не поддерживается"
        }).catch(() => null);
        return;
      }

      try {
        const changed = await handleTelegramStatusCommand({
          entityType,
          entityId: cleanText(rawId, 40),
          nextStatus: "",
          comment: noteCfg.adminComment,
          operator
        });
        await sendTelegramMessage(chatId, noteCfg.doneMessage).catch(() => null);
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Сохранено"
        }).catch(() => null);

        if (changed?.user && changed.kind === "request") {
          const lines = noteCfg.userLines(changed.entity.id);
          await notifyUserChannels(changed.user, lines, {
            type: noteCfg.userEmailType,
            requestId: changed.entity.id,
            text: lines.join("\n")
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось сохранить действие.";
        await sendTelegramMessage(chatId, message).catch(() => null);
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Ошибка"
        }).catch(() => null);
      }
      return;
    }

    if (kind === "cmt" && entityType && rawId) {
      const help = `Чтобы добавить комментарий, отправьте:\n/comment ${entityType} ${rawId} ваш текст`;
      await sendTelegramMessage(chatId, help).catch(() => null);
      await telegramApi("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "Ожидаю команду /comment"
      }).catch(() => null);
      return;
    }

    if (kind === "set" && entityType && rawId && rawStatus) {
      try {
        const changed = await handleTelegramStatusCommand({
          entityType,
          entityId: cleanText(rawId, 40),
          nextStatus: cleanText(rawStatus, 40),
          comment: "Статус изменен через Telegram-бот",
          operator
        });
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Статус обновлен"
        }).catch(() => null);

        if (changed.user) {
          await notifyUserStatusChange(changed.user, changed.kind, changed.entity);
        }
        await notifyAdminsAboutEntityStatusChange({
          entityType: changed.kind,
          entity: changed.entity,
          user: changed.user,
          actor: operator,
          source: "telegram"
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось обновить статус.";
        await sendTelegramMessage(chatId, message).catch(() => null);
        await telegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Ошибка обновления статуса"
        }).catch(() => null);
      }
      return;
    }

    await telegramApi("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Неизвестное действие"
    }).catch(() => null);
  }

  if (update.message) {
    const message = update.message;
    const chatId = String(message?.chat?.id || "");
    const operatorId = String(message?.from?.id || chatId);
    const text = cleanText(message.text, 2000);
    if (!text) {
      return;
    }

    if (text.startsWith("/start")) {
      const payload = cleanText(text.split(/\s+/)[1], 120);
      if (payload && payload.startsWith("link_")) {
        const code = payload.slice(5);
        try {
          let linkedUser = null;
          await mutateDatabase((db) => {
            linkedUser = handleTelegramLinkCode(db, code, message.from);
            return db;
          });
          const resolvedUser = linkedUser && typeof linkedUser.then === "function" ? await linkedUser : linkedUser;
          await sendTelegramMessage(
            chatId,
            `Telegram успешно привязан к аккаунту ${resolvedUser?.fullName || ""}. Теперь вы будете получать уведомления по заказам и заявкам.`
          );
          await notifyUserInEmail(resolvedUser, {
            type: "user_telegram_linked",
            telegramChatId: String(chatId),
            text: `Telegram привязан к аккаунту ${resolvedUser?.id || ""}`
          });
        } catch (error) {
          await sendTelegramMessage(chatId, error instanceof Error ? error.message : "Не удалось привязать Telegram.");
        }
        return;
      }

      await sendTelegramMessage(
        chatId,
        "Бот X Mobile активен.\nЕсли вы хотите привязать Telegram к аккаунту, сгенерируйте код привязки в личном кабинете."
      );
      return;
    }

    if (text.startsWith("/help")) {
      await sendTelegramMessage(
        chatId,
        [
          "Команды бота:",
          "/start link_<CODE> — привязка Telegram",
          "/status <request|order|return> <ID> <status> [комментарий]",
          "/comment <request|order|return> <ID> <комментарий>"
        ].join("\n")
      );
      return;
    }

    const operator = resolveTelegramOperator(operatorId);
    if (!operator) {
      await sendTelegramMessage(chatId, "Действие недоступно. Этот чат не имеет прав оператора.");
      return;
    }

    if (text.startsWith("/comment ")) {
      const parts = text.split(/\s+/);
      const type = mapEntityType(parts[1]);
      const id = cleanText(parts[2], 40);
      const comment = cleanText(parts.slice(3).join(" "), 600);
      if (!type || !id || !comment) {
        await sendTelegramMessage(chatId, "Формат: /comment <request|order|return> <ID> <текст>");
        return;
      }
      try {
        const changed = await handleTelegramStatusCommand({
          entityType: type,
          entityId: id,
          nextStatus: "",
          comment,
          operator
        });
        await sendTelegramMessage(chatId, `Комментарий сохранен для ${changed.entity.id}.`);
      } catch (error) {
        await sendTelegramMessage(chatId, error instanceof Error ? error.message : "Не удалось добавить комментарий.");
      }
      return;
    }

    if (text.startsWith("/status ")) {
      const parts = text.split(/\s+/);
      const type = mapEntityType(parts[1]);
      const id = cleanText(parts[2], 40);
      const nextStatus = cleanText(parts[3], 40);
      const comment = cleanText(parts.slice(4).join(" "), 600);
      if (!type || !id || !nextStatus) {
        await sendTelegramMessage(chatId, "Формат: /status <request|order|return> <ID> <status> [комментарий]");
        return;
      }
      try {
        const changed = await handleTelegramStatusCommand({
          entityType: type,
          entityId: id,
          nextStatus,
          comment: comment || "Статус изменен через Telegram-команду",
          operator
        });
        await sendTelegramMessage(chatId, `Статус ${changed.entity.id} обновлен.`);
        if (changed.user) {
          await notifyUserStatusChange(changed.user, changed.kind, changed.entity);
        }
        await notifyAdminsAboutEntityStatusChange({
          entityType: changed.kind,
          entity: changed.entity,
          user: changed.user,
          actor: operator,
          source: "telegram"
        });
      } catch (error) {
        await sendTelegramMessage(chatId, error instanceof Error ? error.message : "Не удалось обновить статус.");
      }
    }
  }
}

async function handleApi(req, res, pathname, url) {
  ensureApiHeaders(res, req);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (pathname !== "/api/telegram/webhook") {
    checkRateLimit(req, "api");
  }

  if (req.method === "GET" && pathname === "/api/meta/statuses") {
    json(res, 200, {
      ok: true,
      statuses: {
        requests: REQUEST_STATUS_META,
        orders: ORDER_STATUS_META,
        returns: RETURN_STATUS_META
      },
      requestTypes: REQUEST_TYPE_META
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/login") {
    checkRateLimit(req, "auth");
    const payload = await readBody(req);
    const login = cleanText(payload?.login, 120);
    const password = cleanText(payload?.password, 240);
    const account = ADMIN_ACCOUNTS.find((item) => item.login === login && item.password === password) || null;
    if (!account) {
      throw new HttpError(401, "Неверный логин или пароль.");
    }
    const session = createAdminSession(account);
    json(res, 200, {
      ok: true,
      session: {
        token: session.token,
        login: session.login,
        role: session.role,
        expiresAt: session.expiresAt
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/session") {
    const session = requireAdminSession(req);
    json(res, 200, {
      ok: true,
      session: {
        login: session.login,
        role: session.role,
        expiresAt: session.expiresAt
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    checkRateLimit(req, "auth");
    const payload = await readBody(req);
    const password = String(payload?.password || "");
    if (password.length < 8 || !/[a-zA-Zа-яА-Я]/.test(password) || !/\d/.test(password)) {
      throw new HttpError(400, "Пароль должен содержать минимум 8 символов, включая буквы и цифры.");
    }

    let createdUser = null;
    await mutateDatabase((db) => {
      const fullName = cleanText(payload?.fullName, 160);
      const email = cleanText(payload?.email, 120);
      const phone = cleanText(payload?.phone, 60);
      const city = cleanText(payload?.city, 120);
      const emailNorm = normalizeEmail(email);
      const phoneNorm = normalizePhone(phone);
      const existing = findUserByContact(db, emailNorm, phoneNorm);

      if (existing) {
        if (!existing.isAutoCreated) {
          throw new HttpError(409, "Пользователь с таким email или телефоном уже существует.");
        }

        if (emailNorm) {
          const emailConflict = db.users.find((item) => item.id !== existing.id && item.emailNorm === emailNorm);
          if (emailConflict) {
            throw new HttpError(409, "Этот email уже занят другим аккаунтом.");
          }
        }

        if (phoneNorm) {
          const phoneConflict = db.users.find((item) => item.id !== existing.id && item.phoneNorm === phoneNorm);
          if (phoneConflict) {
            throw new HttpError(409, "Этот телефон уже занят другим аккаунтом.");
          }
        }

        if (fullName) {
          existing.fullName = fullName;
        }
        if (email) {
          existing.email = email;
          existing.emailNorm = emailNorm;
        }
        if (phone) {
          existing.phone = phone;
          existing.phoneNorm = phoneNorm;
        }
        if (city) {
          existing.city = city;
        }

        existing.passwordHash = hashPassword(password);
        existing.isAutoCreated = false;
        touchUser(existing);
        createdUser = existing;
        return db;
      }

      createdUser = createCustomerUser(
        db,
        {
          ...payload,
          password
        },
        { allowExisting: false, isAutoCreated: false }
      );
      return db;
    });

    const session = createUserSession(createdUser);
    json(res, 201, {
      ok: true,
      session: {
        token: session.token,
        expiresAt: session.expiresAt
      },
      user: createPublicUser(createdUser, await readDatabase())
    });

    const chats = collectAdminChatIds();
    if (chats.length) {
      const text = [
        "Новый клиент зарегистрирован",
        `ID: ${createdUser.id}`,
        `Имя: ${createdUser.fullName}`,
        `Email: ${createdUser.email || "—"}`,
        `Телефон: ${createdUser.phone || "—"}`
      ].join("\n");
      Promise.all(chats.map((chatId) => sendTelegramMessage(chatId, text).catch(() => null))).catch(() => null);
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    checkRateLimit(req, "auth");
    const payload = await readBody(req);
    const login = cleanText(payload?.login, 120);
    const password = String(payload?.password || "");
    const loginEmail = normalizeEmail(login);
    const loginPhone = normalizePhone(login);

    const db = await readDatabase();
    const user = findUserByContact(db, loginEmail, loginPhone);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new HttpError(401, "Неверный логин или пароль пользователя.");
    }

    await mutateDatabase((mutableDb) => {
      const target = mutableDb.users.find((item) => item.id === user.id);
      if (target) {
        touchUser(target);
      }
      return mutableDb;
    });

    const session = createUserSession(user);
    const freshDb = await readDatabase();
    const freshUser = freshDb.users.find((item) => item.id === user.id) || user;
    json(res, 200, {
      ok: true,
      session: {
        token: session.token,
        expiresAt: session.expiresAt
      },
      user: createPublicUser(freshUser, freshDb)
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/session") {
    const db = await readDatabase();
    const { session, user } = requireUserSession(req, db);
    json(res, 200, {
      ok: true,
      session: {
        token: session.token,
        expiresAt: session.expiresAt
      },
      user: createPublicUser(user, db)
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const token = parseBearerToken(req);
    if (token && token.startsWith("usr_")) {
      userSessions.delete(token);
    }
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/me/profile") {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    json(res, 200, { ok: true, user: createPublicUser(user, db) });
    return;
  }

  if (req.method === "PATCH" && pathname === "/api/me/profile") {
    const payload = await readBody(req);
    let updatedUser = null;
    await mutateDatabase((db) => {
      const { user } = requireUserSession(req, db);
      const fullName = cleanText(payload?.fullName, 160);
      const email = cleanText(payload?.email, 120);
      const phone = cleanText(payload?.phone, 60);
      const city = cleanText(payload?.city, 120);
      const telegramUsername = normalizeTelegramUsername(payload?.telegramUsername);

      if (fullName) {
        user.fullName = fullName;
      }
      if (city) {
        user.city = city;
      }

      if (email) {
        const emailNorm = normalizeEmail(email);
        const conflict = db.users.find((item) => item.id !== user.id && item.emailNorm === emailNorm);
        if (conflict) {
          throw new HttpError(409, "Этот email уже привязан к другому пользователю.");
        }
        user.email = email;
        user.emailNorm = emailNorm;
      }

      if (phone) {
        const phoneNorm = normalizePhone(phone);
        const conflict = db.users.find((item) => item.id !== user.id && item.phoneNorm === phoneNorm);
        if (conflict) {
          throw new HttpError(409, "Этот телефон уже привязан к другому пользователю.");
        }
        user.phone = phone;
        user.phoneNorm = phoneNorm;
      }

      user.telegramUsername = telegramUsername;
      touchUser(user);
      updatedUser = user;
      return db;
    });
    const db = await readDatabase();
    const fresh = db.users.find((item) => item.id === updatedUser.id) || updatedUser;
    json(res, 200, { ok: true, user: createPublicUser(fresh, db) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/me/change-password") {
    const payload = await readBody(req);
    const currentPassword = String(payload?.currentPassword || "");
    const newPassword = String(payload?.newPassword || "");
    if (newPassword.length < 8 || !/[a-zA-Zа-яА-Я]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw new HttpError(400, "Новый пароль должен содержать минимум 8 символов, включая буквы и цифры.");
    }
    await mutateDatabase((db) => {
      const { user } = requireUserSession(req, db);
      const allowSkipCurrent = Boolean(user.isAutoCreated);
      if (!allowSkipCurrent && !verifyPassword(currentPassword, user.passwordHash)) {
        throw new HttpError(401, "Текущий пароль указан неверно.");
      }
      user.passwordHash = hashPassword(newPassword);
      user.isAutoCreated = false;
      touchUser(user);
      return db;
    });
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/me/telegram/link-code") {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);

    let responsePayload = null;
    await mutateDatabase((mutableDb) => {
      const target = mutableDb.users.find((item) => item.id === user.id);
      if (!target) {
        throw new HttpError(404, "Пользователь не найден.");
      }

      mutableDb.telegramLinkCodes = mutableDb.telegramLinkCodes.filter(
        (item) => item.userId !== target.id || Number(item.expiresAt) > Date.now()
      );

      const code = randomCode(8);
      const expiresAt = Date.now() + 10 * 60 * 1000;
      mutableDb.telegramLinkCodes.push({
        code,
        userId: target.id,
        createdAt: nowIso(),
        expiresAt,
        usedAt: ""
      });

      responsePayload = {
        code,
        expiresAt,
        deepLink: botConfig.username ? `https://t.me/${botConfig.username}?start=link_${code}` : "",
        botUsername: botConfig.username ? `@${botConfig.username}` : ""
      };
      return mutableDb;
    });

    json(res, 200, { ok: true, link: responsePayload });
    return;
  }

  if (req.method === "POST" && pathname === "/api/me/telegram/unlink") {
    await mutateDatabase((db) => {
      const { user } = requireUserSession(req, db);
      user.telegram = null;
      touchUser(user);
      return db;
    });
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/me/orders") {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    let list = db.orders.filter((item) => item.userId === user.id);
    const statusFilter = cleanText(url.searchParams.get("status"), 40);
    if (statusFilter) {
      list = list.filter((item) => item.status === statusFilter);
    }
    const query = cleanText(url.searchParams.get("q"), 120);
    list = filterBySearch(list, query, (item) => {
      const itemsText = (item.items || []).map((entry) => entry.name).join(" ");
      return `${item.id} ${item.city} ${item.status} ${itemsText}`;
    });
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    json(res, 200, { ok: true, orders: list.map(buildOrderView) });
    return;
  }

  const meOrderMatch = pathname.match(/^\/api\/me\/orders\/([^/]+)$/);
  if (req.method === "GET" && meOrderMatch) {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    const id = decodeURIComponent(meOrderMatch[1]);
    const order = db.orders.find((item) => item.id === id && item.userId === user.id) || null;
    if (!order) {
      throw new HttpError(404, "Заказ не найден.");
    }
    json(res, 200, { ok: true, order: buildOrderView(order) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/me/requests") {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    let list = db.requests.filter((item) => item.userId === user.id);
    const statusFilter = cleanText(url.searchParams.get("status"), 40);
    const typeFilter = cleanText(url.searchParams.get("type"), 40);
    if (statusFilter) {
      list = list.filter((item) => item.status === statusFilter);
    }
    if (typeFilter) {
      list = list.filter((item) => item.type === typeFilter);
    }
    const query = cleanText(url.searchParams.get("q"), 120);
    list = filterBySearch(list, query, (item) => `${item.id} ${item.client?.fullName || ""} ${item.client?.phone || ""} ${item.type}`);
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    json(res, 200, { ok: true, requests: list.map(buildRequestView) });
    return;
  }

  const meRequestMatch = pathname.match(/^\/api\/me\/requests\/([^/]+)$/);
  if (req.method === "GET" && meRequestMatch) {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    const id = decodeURIComponent(meRequestMatch[1]);
    const request = db.requests.find((item) => item.id === id && item.userId === user.id) || null;
    if (!request) {
      throw new HttpError(404, "Заявка не найдена.");
    }
    json(res, 200, { ok: true, request: buildRequestView(request) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/me/returns") {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    let list = db.returns.filter((item) => item.userId === user.id);
    const statusFilter = cleanText(url.searchParams.get("status"), 40);
    if (statusFilter) {
      list = list.filter((item) => item.status === statusFilter);
    }
    const query = cleanText(url.searchParams.get("q"), 120);
    list = filterBySearch(list, query, (item) => `${item.id} ${item.orderId} ${item.reason} ${item.description}`);
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    json(res, 200, { ok: true, returns: list.map(buildReturnView) });
    return;
  }

  const meReturnMatch = pathname.match(/^\/api\/me\/returns\/([^/]+)$/);
  if (req.method === "GET" && meReturnMatch) {
    const db = await readDatabase();
    const { user } = requireUserSession(req, db);
    const id = decodeURIComponent(meReturnMatch[1]);
    const record = db.returns.find((item) => item.id === id && item.userId === user.id) || null;
    if (!record) {
      throw new HttpError(404, "Возврат не найден.");
    }
    json(res, 200, { ok: true, return: buildReturnView(record) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/me/returns") {
    const payload = await readBody(req);
    let created = null;
    let owner = null;
    await mutateDatabase((db) => {
      const { user } = requireUserSession(req, db);
      owner = user;
      const actor = {
        role: "client",
        id: user.id,
        name: user.fullName || "Клиент"
      };
      created = createReturnRecord(db, payload, user, actor);
      touchUser(user);
      return db;
    });

    const rawAttachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
    const savedAttachments = await saveReturnAttachments(created.id, rawAttachments);
    if (savedAttachments.length) {
      await mutateDatabase((db) => {
        const target = findReturnById(db, created.id);
        if (target) {
          target.attachments = savedAttachments;
          target.updatedAt = nowIso();
        }
        return db;
      });
    }

    const db = await readDatabase();
    const fresh = findReturnById(db, created.id) || created;
    json(res, 201, { ok: true, return: buildReturnView(fresh) });
    Promise.all([
      notifyAdminsAboutReturn(fresh, owner).catch(() => null),
      notifyUserChannels(
        owner,
        [`Создана заявка на возврат ${fresh.id}`, `Причина: ${fresh.reason}`],
        {
          type: "user_return_created",
          returnId: fresh.id,
          orderId: fresh.orderId,
          reason: fresh.reason
        }
      ).catch(() => null)
    ]).catch(() => null);
    return;
  }

  if (req.method === "POST" && pathname === "/api/applications") {
    const payload = await readBody(req);
    let createdRequest = null;
    let createdOrder = null;
    let user = null;

    await mutateDatabase((db) => {
      const userSession = resolveUserSession(req);
      if (userSession) {
        user = db.users.find((item) => item.id === userSession.userId) || null;
      }

      const actor = {
        role: "client",
        id: user?.id || "guest",
        name: user?.fullName || "Клиент"
      };

      const client = normalizeClient(payload?.client);
      if (!user) {
        user = upsertUserFromClient(db, client);
      } else {
        if (!user.fullName && client.fullName) {
          user.fullName = client.fullName;
        }
        if (!user.email && client.email) {
          user.email = client.email;
          user.emailNorm = normalizeEmail(client.email);
        }
        if (!user.phone && client.phone) {
          user.phone = client.phone;
          user.phoneNorm = normalizePhone(client.phone);
        }
        touchUser(user);
      }

      const prepared = {
        ...payload,
        client: {
          ...client,
          email: user.email || client.email,
          phone: user.phone || client.phone,
          fullName: user.fullName || client.fullName
        },
        details: {
          ...payload.details,
          telegram: normalizeTelegramUsername(payload?.details?.telegram || user.telegramUsername || "")
        }
      };
      const created = createRequestRecord(db, prepared, user, actor);
      createdRequest = created.request;
      createdOrder = created.order;
      return db;
    });

    json(res, 201, { ok: true, application: toLegacyApplication(createdRequest) });

    Promise.all([
      createdOrder && createdRequest?.source === "shop_checkout"
        ? Promise.resolve()
        : notifyAdminsAboutRequest(createdRequest, user, createdOrder).catch(() => null),
      createdOrder ? notifyAdminsAboutOrder(createdOrder, user, createdRequest).catch(() => null) : Promise.resolve(),
      notifyUserChannels(
        user,
        [`Создана заявка ${createdRequest.id}`, `Тип: ${REQUEST_TYPE_META[createdRequest.type] || createdRequest.type}`],
        {
          type: "user_request_created",
          requestId: createdRequest.id,
          requestType: createdRequest.type
        }
      ).catch(() => null),
      createdOrder
        ? notifyUserChannels(
            user,
            [`Создан заказ ${createdOrder.id}`, `Сумма: ${createdOrder.totalPrice} ₽`],
            {
              type: "user_order_created",
              orderId: createdOrder.id,
              totalPrice: createdOrder.totalPrice
            }
          ).catch(() => null)
        : Promise.resolve()
    ]).catch(() => null);
    return;
  }

  if (req.method === "GET" && pathname === "/api/applications") {
    requireAdminSession(req, "manager");
    const db = await readDatabase();
    const applications = db.requests
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toLegacyApplication);
    json(res, 200, { ok: true, applications });
    return;
  }

  const legacyStatusMatch = pathname.match(/^\/api\/applications\/([^/]+)\/status$/);
  if (req.method === "PATCH" && legacyStatusMatch) {
    const session = requireAdminSession(req, "manager");
    const requestId = decodeURIComponent(legacyStatusMatch[1]);
    const payload = await readBody(req);
    const nextStatus = sanitizeLegacyStatus(payload?.status);
    const note = cleanText(payload?.note, 600);

    let updated = null;
    let targetUser = null;

    await mutateDatabase((db) => {
      const request = findRequestById(db, requestId);
      if (!request) {
        throw new HttpError(404, "Заявка не найдена.");
      }
      const actor = {
        role: session.role,
        id: session.id,
        name: session.login
      };
      applyStatusChange({
        target: request,
        entityType: "request",
        nextStatus,
        transitions: REQUEST_STATUS_TRANSITIONS,
        labelResolver: requestStatusLabel,
        actor,
        comment: note,
        city: request.city
      });
      updated = request;
      targetUser = db.users.find((item) => item.id === request.userId) || null;
      return db;
    });

    json(res, 200, { ok: true, application: toLegacyApplication(updated) });
    if (targetUser) {
      notifyUserStatusChange(targetUser, "request", updated).catch(() => null);
    }
    notifyAdminsAboutEntityStatusChange({
      entityType: "request",
      entity: updated,
      user: targetUser,
      actor: {
        role: session.role,
        id: session.id,
        name: session.login
      },
      source: "site"
    }).catch(() => null);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/users") {
    requireAdminSession(req, "manager");
    const db = await readDatabase();
    let users = db.users.filter((item) => item.role === "customer");
    const q = cleanText(url.searchParams.get("q"), 120);
    users = filterBySearch(users, q, (item) => {
      const tg = item.telegramUsername || item.telegram?.username || "";
      return `${item.id} ${item.fullName} ${item.email} ${item.phone} ${tg}`;
    });

    const linkedFilter = cleanText(url.searchParams.get("telegram"), 20);
    if (linkedFilter === "linked") {
      users = users.filter((item) => Boolean(item.telegram?.chatId));
    } else if (linkedFilter === "none") {
      users = users.filter((item) => !item.telegram?.chatId);
    }

    const list = users
      .map((user) => {
        const view = createPublicUser(user, db);
        return {
          ...view,
          telegramDirectLink: directTelegramLink(user)
        };
      })
      .sort((a, b) => new Date(b.lastActivityAt || b.createdAt).getTime() - new Date(a.lastActivityAt || a.createdAt).getTime());

    json(res, 200, { ok: true, users: list });
    return;
  }

  const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (req.method === "GET" && adminUserMatch) {
    requireAdminSession(req, "manager");
    const userId = decodeURIComponent(adminUserMatch[1]);
    const db = await readDatabase();
    const user = db.users.find((item) => item.id === userId) || null;
    if (!user) {
      throw new HttpError(404, "Пользователь не найден.");
    }
    const requests = db.requests.filter((item) => item.userId === user.id).map(buildRequestView);
    const orders = db.orders.filter((item) => item.userId === user.id).map(buildOrderView);
    const returns = db.returns.filter((item) => item.userId === user.id).map(buildReturnView);
    json(res, 200, {
      ok: true,
      user: {
        ...createPublicUser(user, db),
        telegramDirectLink: directTelegramLink(user),
        requests,
        orders,
        returns
      }
    });
    return;
  }

  if (req.method === "PATCH" && adminUserMatch) {
    requireAdminSession(req, "admin");
    const userId = decodeURIComponent(adminUserMatch[1]);
    const payload = await readBody(req);
    const db = await readDatabase();
    const user = db.users.find((item) => item.id === userId);
    if (!user) {
      throw new HttpError(404, "Пользователь не найден.");
    }
    let changed = false;
    if (payload.phone !== undefined) {
      const phone = normalizePhone(String(payload.phone || "").trim());
      if (phone && phone !== user.phone) {
        const duplicate = db.users.find((item) => item.id !== userId && item.phone === phone);
        if (duplicate) {
          throw new HttpError(409, "Этот номер телефона уже используется другим пользователем.");
        }
        user.phone = phone;
        changed = true;
      }
    }
    if (payload.email !== undefined) {
      const email = cleanText(String(payload.email || "").trim().toLowerCase(), 200);
      if (email && email !== user.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new HttpError(400, "Некорректный формат email.");
        }
        const duplicate = db.users.find((item) => item.id !== userId && item.email === email);
        if (duplicate) {
          throw new HttpError(409, "Этот email уже используется другим пользователем.");
        }
        user.email = email;
        changed = true;
      }
    }
    if (payload.password !== undefined) {
      const password = String(payload.password || "").trim();
      if (password.length < 6) {
        throw new HttpError(400, "Пароль должен содержать не менее 6 символов.");
      }
      user.passwordHash = hashPassword(password);
      user.isAutoCreated = false;
      changed = true;
    }
    if (changed) {
      touchUser(user);
      await writeDatabase(db);
    }
    json(res, 200, { ok: true, user: createPublicUser(user, db) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/orders") {
    requireAdminSession(req, "manager");
    const db = await readDatabase();
    let orders = db.orders.slice();
    const status = cleanText(url.searchParams.get("status"), 40);
    if (status) {
      orders = orders.filter((item) => item.status === status);
    }
    const q = cleanText(url.searchParams.get("q"), 120);
    orders = filterBySearch(orders, q, (item) => {
      const user = db.users.find((entry) => entry.id === item.userId);
      const linkedRequest = db.requests.find((entry) => entry.id === item.requestId);
      const itemsText = (item.items || []).map((entry) => entry.name).join(" ");
      const recipientCity = cleanText(linkedRequest?.details?.delivery?.city, 120);
      const email = cleanText(linkedRequest?.client?.email, 120) || cleanText(user?.email, 120);
      return `${item.id} ${item.city} ${item.status} ${user?.fullName || ""} ${user?.phone || ""} ${email} ${recipientCity} ${itemsText}`;
    });
    const list = orders
      .map((order) => {
        const user = db.users.find((item) => item.id === order.userId) || null;
        const linkedRequest = db.requests.find((item) => item.id === order.requestId) || null;
        const deliveryMode = cleanText(linkedRequest?.details?.delivery?.mode, 40).toLowerCase() === "other_city" ? "other_city" : "local";
        const recipientCity = cleanText(linkedRequest?.details?.delivery?.city, 120);
        const clientEmail = cleanText(linkedRequest?.client?.email, 120) || cleanText(user?.email, 120);
        return {
          ...buildOrderView(order),
          user: user ? createPublicUser(user, db) : null,
          telegramDirectLink: user ? directTelegramLink(user) : "",
          delivery: {
            mode: deliveryMode,
            city: recipientCity
          },
          isOtherCityDelivery: deliveryMode === "other_city",
          recipientCity,
          clientEmail
        };
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    json(res, 200, { ok: true, orders: list });
    return;
  }

  const adminOrderStatusMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
  if (req.method === "PATCH" && adminOrderStatusMatch) {
    const session = requireAdminSession(req, "manager");
    const orderId = decodeURIComponent(adminOrderStatusMatch[1]);
    const payload = await readBody(req);
    const nextStatus = cleanText(payload?.status, 40);
    const comment = cleanText(payload?.comment, 600);
    let updated = null;
    let targetUser = null;
    await mutateDatabase((db) => {
      const order = findOrderById(db, orderId);
      if (!order) {
        throw new HttpError(404, "Заказ не найден.");
      }
      applyStatusChange({
        target: order,
        entityType: "order",
        nextStatus,
        transitions: ORDER_STATUS_TRANSITIONS,
        labelResolver: orderStatusLabel,
        actor: {
          role: session.role,
          id: session.id,
          name: session.login
        },
        comment,
        city: order.city
      });
      updated = order;
      targetUser = db.users.find((item) => item.id === order.userId) || null;
      return db;
    });
    json(res, 200, { ok: true, order: buildOrderView(updated) });
    if (targetUser) {
      notifyUserStatusChange(targetUser, "order", updated).catch(() => null);
    }
    notifyAdminsAboutEntityStatusChange({
      entityType: "order",
      entity: updated,
      user: targetUser,
      actor: {
        role: session.role,
        id: session.id,
        name: session.login
      },
      source: "site"
    }).catch(() => null);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/returns") {
    requireAdminSession(req, "manager");
    const db = await readDatabase();
    let list = db.returns.slice();
    const status = cleanText(url.searchParams.get("status"), 40);
    if (status) {
      list = list.filter((item) => item.status === status);
    }
    const q = cleanText(url.searchParams.get("q"), 120);
    list = filterBySearch(list, q, (item) => `${item.id} ${item.orderId} ${item.reason} ${item.description}`);
    const mapped = list
      .map((item) => {
        const user = db.users.find((entry) => entry.id === item.userId) || null;
        return {
          ...buildReturnView(item),
          user: user ? createPublicUser(user, db) : null,
          telegramDirectLink: user ? directTelegramLink(user) : ""
        };
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    json(res, 200, { ok: true, returns: mapped });
    return;
  }

  const adminReturnStatusMatch = pathname.match(/^\/api\/admin\/returns\/([^/]+)\/status$/);
  if (req.method === "PATCH" && adminReturnStatusMatch) {
    const session = requireAdminSession(req, "manager");
    const returnId = decodeURIComponent(adminReturnStatusMatch[1]);
    const payload = await readBody(req);
    const nextStatus = cleanText(payload?.status, 40);
    const comment = cleanText(payload?.comment, 600);
    let updated = null;
    let targetUser = null;
    await mutateDatabase((db) => {
      const record = findReturnById(db, returnId);
      if (!record) {
        throw new HttpError(404, "Возврат не найден.");
      }
      applyStatusChange({
        target: record,
        entityType: "return",
        nextStatus,
        transitions: RETURN_STATUS_TRANSITIONS,
        labelResolver: returnStatusLabel,
        actor: {
          role: session.role,
          id: session.id,
          name: session.login
        },
        comment,
        city: record.city
      });
      updated = record;
      targetUser = db.users.find((item) => item.id === record.userId) || null;
      return db;
    });
    json(res, 200, { ok: true, return: buildReturnView(updated) });
    if (targetUser) {
      notifyUserStatusChange(targetUser, "return", updated).catch(() => null);
    }
    notifyAdminsAboutEntityStatusChange({
      entityType: "return",
      entity: updated,
      user: targetUser,
      actor: {
        role: session.role,
        id: session.id,
        name: session.login
      },
      source: "site"
    }).catch(() => null);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/seo") {
    requireAdminSession(req, "manager");
    const seo = await readSeoData();
    json(res, 200, { ok: true, seo });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/seo") {
    requireAdminSession(req, "admin");
    const payload = await readBody(req);
    if (!payload || typeof payload !== "object") {
      throw new HttpError(400, "Неверный формат данных.");
    }
    const saved = await writeSeoData(payload);
    json(res, 200, { ok: true, seo: saved });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/bot-config") {
    requireAdminSession(req, "admin");
    json(res, 200, {
      ok: true,
      config: {
        token: botConfig.token,
        username: botConfig.username,
        webhookSecret: botConfig.webhookSecret,
        adminChatIds: botConfig.adminChatIds.join(", "),
        managerChatIds: botConfig.managerChatIds.join(", "),
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/bot-config") {
    requireAdminSession(req, "admin");
    const payload = await readBody(req);
    if (!payload || typeof payload !== "object") {
      throw new HttpError(400, "Неверный формат данных.");
    }
    const prevToken = botConfig.token;
    if (payload.token !== undefined) botConfig.token = String(payload.token || "").trim();
    if (payload.username !== undefined) botConfig.username = String(payload.username || "").trim().replace(/^@/, "");
    if (payload.webhookSecret !== undefined) botConfig.webhookSecret = String(payload.webhookSecret || "").trim();
    if (payload.adminChatIds !== undefined) botConfig.adminChatIds = parseCsv(String(payload.adminChatIds || ""));
    if (payload.managerChatIds !== undefined) botConfig.managerChatIds = parseCsv(String(payload.managerChatIds || ""));
    await writeBotConfig();
    if (botConfig.token && (botConfig.token !== prevToken || payload.token !== undefined)) {
      setupTelegramWebhook().catch((err) => console.error("Webhook re-setup failed:", err.message));
    }
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/proxy-yml") {
    requireAdminSession(req, "admin");
    const targetUrl = cleanText(url.searchParams.get("url"), 500);
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      throw new HttpError(400, "Укажите корректный URL YML-файла.");
    }
    let ymlResponse;
    try {
      ymlResponse = await fetch(targetUrl, { headers: { "User-Agent": "XMobile-Admin/1.0" } });
    } catch {
      throw new HttpError(502, "Не удалось подключиться к удалённому серверу.");
    }
    if (!ymlResponse.ok) {
      throw new HttpError(502, `Сервер вернул ошибку: ${ymlResponse.status}`);
    }
    const text = await ymlResponse.text();
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.end(text);
    return;
  }

  if (req.method === "POST" && pathname === "/api/telegram/webhook") {
    if (botConfig.webhookSecret) {
      const secret = cleanText(req.headers["x-telegram-bot-api-secret-token"], 200);
      if (secret !== botConfig.webhookSecret) {
        throw new HttpError(403, "Webhook secret token mismatch.");
      }
    }
    const payload = await readBody(req);
    await handleTelegramUpdate(payload).catch((error) => {
      console.error("telegram webhook error:", error instanceof Error ? error.message : error);
    });
    json(res, 200, { ok: true });
    return;
  }

  throw new HttpError(404, "API route not found.");
}

function resolveStaticPath(pathname) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  if (normalizedPath.startsWith("/server-data")) {
    throw new HttpError(403, "Доступ запрещен.");
  }
  const relative = normalizedPath.replace(/^\/+/, "");
  const absolute = path.join(ROOT_DIR, relative);
  const safe = path.normalize(absolute);
  if (!safe.startsWith(ROOT_DIR)) {
    throw new HttpError(403, "Доступ запрещен.");
  }
  return safe;
}

async function handleStatic(req, res, pathname) {
  const filePath = resolveStaticPath(pathname);
  let finalPath = filePath;
  let stat = null;

  try {
    stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      finalPath = path.join(filePath, "index.html");
      stat = await fsp.stat(finalPath);
    }
  } catch {
    throw new HttpError(404, "Файл не найден.");
  }

  if (!stat.isFile()) {
    throw new HttpError(404, "Файл не найден.");
  }

  const ext = path.extname(finalPath).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const isHtml = ext === ".html";
  const headers = {
    "Content-Type": mime,
    "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600"
  };
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  if (isHtml) {
    const baseName = path.basename(finalPath);
    const seo = await readSeoData();
    let html = await fsp.readFile(finalPath, "utf8");
    html = injectSeoIntoHtml(html, baseName, seo);
    res.end(html);
    return;
  }
  fs.createReadStream(finalPath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url || "/", `http://${host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, url);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      throw new HttpError(405, "Method Not Allowed");
    }

    await handleStatic(req, res, pathname);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if ((req.url || "").startsWith("/api/")) {
      json(res, status, { ok: false, error: message });
      return;
    }

    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(message);
  }
});

async function setupTelegramWebhook() {
  if (!botConfig.token || !APP_BASE_URL) {
    return;
  }
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(APP_BASE_URL);
  if (isLocal) {
    console.log("Telegram webhook: skipped (APP_BASE_URL is localhost, set a public URL to auto-register)");
    return;
  }
  const webhookUrl = `${APP_BASE_URL}/api/telegram/webhook`;
  try {
    const payload = { url: webhookUrl, allowed_updates: ["message", "callback_query"] };
    if (botConfig.webhookSecret) {
      payload.secret_token = botConfig.webhookSecret;
    }
    const result = await telegramApi("setWebhook", payload);
    console.log(`Telegram webhook: registered → ${webhookUrl}`, result?.ok ? "(ok)" : "(warning)");
  } catch (error) {
    console.error("Telegram webhook registration failed:", error instanceof Error ? error.message : error);
  }
}

server.listen(PORT, HOST, async () => {
  await ensureDatabase();
  await readBotConfig();
  console.log(`X Mobile server started: ${APP_BASE_URL} (bind ${HOST}:${PORT})`);
  if (botConfig.token) {
    console.log("Telegram bot integration: enabled");
    await setupTelegramWebhook();
  } else {
    console.log("Telegram bot integration: disabled (botConfig.token not set)");
  }
});

