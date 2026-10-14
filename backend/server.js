// server.js — Care Connect backend.
// Zero npm dependencies: just Node's built-in http + node:sqlite (Node 22.5+).
// Run with:  node server.js   (from inside the backend/ folder)
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const db = require("./db");
const Router = require("./lib/router");
const { hashPassword, verifyPassword, newToken } = require("./lib/auth");

const PORT = process.env.PORT || 5000;
const ROOT_DIR = path.join(__dirname, ".."); // the whole CareConnect/ folder (frontend lives here)
const SESSION_DAYS = 7;
// OTP delivery and verification are handled by Twilio Verify. Never log OTPs.
// In-memory request throttles protect one running instance; use a shared store for multi-instance hosting.
const resetRequestLimits = new Map();
const resetVerifyLimits = new Map();
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_REQUESTS = 3;
const RESET_MAX_VERIFY = 8;

function hitRateLimit(store, key, max, windowMs = RESET_WINDOW_MS) {
  const now = Date.now();
  const recent = (store.get(key) || []).filter(ts => now - ts < windowMs);
  if (recent.length >= max) { store.set(key, recent); return true; }
  recent.push(now);
  store.set(key, recent);
  return false;
}
function twilioConfigReady() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}
async function twilioVerify(pathname, fields) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(fields)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "SMS provider request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}
function requestIp(req) {
  // Do not trust X-Forwarded-For unless your reverse proxy is configured to sanitize it.
  return req.socket?.remoteAddress || "unknown";
}

const router = new Router();

// Basic health check for local development/deployment monitoring.
router.get("/api/health", async (req, res) => {
  send(res, 200, { ok: true, service: "Care Connect API", time: new Date().toISOString() });
});

/* ----------------------------- small helpers ----------------------------- */
function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(payload);
}
function badRequest(res, message) { send(res, 400, { error: message }); }
function unauthorized(res, message = "Login required") { send(res, 401, { error: message }); }
function forbidden(res, message = "Not allowed for this account type") { send(res, 403, { error: message }); }
function notFound(res, message = "Not found") { send(res, 404, { error: message }); }

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) req.destroy(); // 2MB safety cap
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function getUserFromToken(token) {
  if (!token) return null;
  const row = db.prepare(
    "SELECT s.token, s.expires_at, u.id, u.role, u.name, u.phone, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?"
  ).get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, role: row.role, name: row.name, phone: row.phone, email: row.email || "" };
}

function requireAuth(req) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return getUserFromToken(token);
}

/* ================================ AUTH =================================== */

router.post("/api/auth/register", async (req, res) => {
  const body = req.body;
  const { role, name, phone, email, password } = body;
  const validRoles = ["patient", "doctor", "driver", "pharmacy", "bloodbank"];
  if (!role || !validRoles.includes(role)) return badRequest(res, "Invalid or missing role");
  if (!name || !phone || !email || !password) return badRequest(res, "name, phone, email and password are required");
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return badRequest(res, "Enter a valid email address");
  if (String(password).length < 8) return badRequest(res, "Password must be at least 8 characters");
  if (!/^\d{10}$/.test(String(phone).trim())) {return badRequest(res, "Phone must be a 10-digit mobile number");
}
  if (role === "doctor" && !body.specialty) return badRequest(res, "specialty is required for doctor accounts");
  if (role === "pharmacy" && !body.shop_name) return badRequest(res, "shop_name is required for pharmacy accounts");
  if (role === "bloodbank" && !body.bank_name) return badRequest(res, "bank_name is required for blood bank accounts");

  const existing = db.prepare("SELECT id FROM users WHERE phone = ? OR email = ?").get(phone, normalizedEmail);
  if (existing) return badRequest(res, "An account with this phone number or email already exists");

  const { hash, salt } = hashPassword(password);
  const info = db.prepare(
    "INSERT INTO users (role,name,phone,email,password_hash,password_salt) VALUES (?,?,?,?,?,?)"
  ).run(role, name, phone, normalizedEmail, hash, salt);
  const userId = Number(info.lastInsertRowid);

  if (role === "doctor") {
    db.prepare("INSERT INTO doctors (user_id,specialty,available) VALUES (?,?,0)").run(userId, body.specialty);
  } else if (role === "driver") {
    db.prepare("INSERT INTO drivers (user_id,vehicle_number,area,available) VALUES (?,?,?,0)")
      .run(userId, body.vehicle_number || "", body.area || "");
  } else if (role === "pharmacy") {
    db.prepare("INSERT INTO pharmacies (user_id,shop_name,address) VALUES (?,?,?)")
      .run(userId, body.shop_name, body.address || "");
  } else if (role === "bloodbank") {
    db.prepare("INSERT INTO blood_banks (user_id,bank_name,address) VALUES (?,?,?)")
      .run(userId, body.bank_name, body.address || "");
  }

  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare("INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)").run(token, userId, expires);
  send(res, 201, { token, user: { id: userId, role, name, phone, email: normalizedEmail } });
});

router.post("/api/auth/login", async (req, res) => {
  const identifier = String(req.body.identifier || req.body.phone || req.body.email || "").trim();
  const password = String(req.body.password || "");
  if (!identifier || !password) return badRequest(res, "email or phone and password are required");
  const user = db.prepare("SELECT * FROM users WHERE phone = ? OR lower(email) = lower(?)").get(identifier, identifier);
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return unauthorized(res, "Incorrect phone number or password");
  }
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare("INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)").run(token, user.id, expires);
  send(res, 200, { token, user: { id: user.id, role: user.role, name: user.name, phone: user.phone, email: user.email || "" } });
});

// Password reset via Twilio Verify: email or SMS channel, selected by the user.
router.post("/api/auth/forgot-password", async (req, res) => {
  const channel = String(req.body.channel || "email").toLowerCase();
  const identifier = String(req.body.identifier || (channel === "email" ? req.body.email : req.body.phone) || "").trim();
  if (!["email", "sms"].includes(channel)) return badRequest(res, "Choose email or phone verification");
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return badRequest(res, "Enter a valid email address");
  if (channel === "sms" && !/^\d{10}$/.test(identifier)) return badRequest(res, "Enter a valid 10-digit Indian mobile number");
  const ip = requestIp(req);
  const rateKey = `${channel}:${identifier.toLowerCase()}`;
  if (hitRateLimit(resetRequestLimits, `ip:${ip}`, 10) || hitRateLimit(resetRequestLimits, rateKey, RESET_MAX_REQUESTS)) {
    return send(res, 429, { error: "Too many OTP requests. Please wait 15 minutes before trying again." }, { "Retry-After": "900" });
  }
  if (!twilioConfigReady()) {
    return send(res, 503, { error: "Twilio Verify is not configured. Set the three TWILIO environment variables and restart the backend." });
  }
  const user = channel === "email"
    ? db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(identifier)
    : db.prepare("SELECT id FROM users WHERE phone = ?").get(identifier);
  if (user) {
    try {
      const to = channel === "sms" ? `+91${identifier}` : identifier.toLowerCase();
      await twilioVerify("Verifications", { To: to, Channel: channel });
    } catch (err) {
      console.error(`Twilio Verify ${channel} send failed:`, err.message);
      return send(res, 502, { error: `Could not send the ${channel === "email" ? "email" : "SMS"} OTP. Check Twilio Verify channel configuration and logs.` });
    }
  }
  send(res, 200, { message: `If this ${channel === "email" ? "email address" : "mobile number"} is registered, an OTP has been sent. Expiry follows your Twilio Verify service settings.` });
});

router.post("/api/auth/reset-password", async (req, res) => {
  const channel = String(req.body.channel || "email").toLowerCase();
  const identifier = String(req.body.identifier || (channel === "email" ? req.body.email : req.body.phone) || "").trim();
  const code = String(req.body.code || req.body.otp || "").trim();
  const newPassword = String(req.body.newPassword || "");
  if (!["email", "sms"].includes(channel)) return badRequest(res, "Choose email or phone verification");
  if (channel === "email" ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) : !/^\d{10}$/.test(identifier)) {
    return badRequest(res, channel === "email" ? "Enter a valid email address" : "Enter a valid 10-digit mobile number");
  }
  if (!/^\d{6}$/.test(code)) return badRequest(res, "Enter the 6-digit OTP");
  if (newPassword.length < 8 || !/\d/.test(newPassword)) return badRequest(res, "Password must be at least 8 characters and include a number");
  const ip = requestIp(req);
  const rateKey = `${channel}:${identifier.toLowerCase()}`;
  if (hitRateLimit(resetVerifyLimits, `ip:${ip}`, 20) || hitRateLimit(resetVerifyLimits, rateKey, RESET_MAX_VERIFY)) {
    return send(res, 429, { error: "Too many verification attempts. Request a new OTP after 15 minutes." }, { "Retry-After": "900" });
  }
  if (!twilioConfigReady()) return send(res, 503, { error: "Twilio Verify is not configured. Set the three TWILIO environment variables and restart the backend." });
  const user = channel === "email"
    ? db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(identifier)
    : db.prepare("SELECT id FROM users WHERE phone = ?").get(identifier);
  if (!user) return badRequest(res, "OTP is invalid or expired. Request a new OTP.");
  let verification;
  try {
    const to = channel === "sms" ? `+91${identifier}` : identifier.toLowerCase();
    verification = await twilioVerify("VerificationCheck", { To: to, Code: code });
  } catch (err) {
    console.error(`Twilio Verify ${channel} check failed:`, err.message);
    return send(res, 502, { error: "OTP verification could not be completed. Check Twilio Verify setup and try again." });
  }
  if (verification.status !== "approved") return badRequest(res, "OTP is invalid or expired. Request a new OTP.");
  const { hash, salt } = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").run(hash, salt, user.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  send(res, 200, { ok: true, message: "Password updated successfully. Sign in with your new password." });
});

router.get("/api/auth/me", async (req, res) => {
  const user = requireAuth(req);
  if (!user) return unauthorized(res);
  send(res, 200, { user });
});

/* =============================== PROFILE ================================== */
router.get("/api/profile", async (req, res) => {
  const user = requireAuth(req);
  if (!user) return unauthorized(res);
  const profile = db.prepare("SELECT emergency_contact, address, date_of_birth FROM profiles WHERE user_id = ?").get(user.id) || {};
  send(res, 200, { profile: { name: user.name, phone: user.phone, email: user.email || "", emergency_contact: profile.emergency_contact || "", address: profile.address || "", date_of_birth: profile.date_of_birth || "" } });
});

router.put("/api/profile", async (req, res) => {
  const user = requireAuth(req);
  if (!user) return unauthorized(res);
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, "Enter a valid email address");
  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ? AND id <> ?").get(email, user.id);
  if (existingEmail) return badRequest(res, "This email address is already used by another account");
  const emergency = String(body.emergency_contact || "").trim();
  const address = String(body.address || "").trim();
  const dob = String(body.date_of_birth || "").trim();
  if (name.length < 2 || name.length > 100) return badRequest(res, "Name must be between 2 and 100 characters");
  db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, user.id);
  db.prepare(`INSERT INTO profiles (user_id, emergency_contact, address, date_of_birth, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET emergency_contact=excluded.emergency_contact, address=excluded.address, date_of_birth=excluded.date_of_birth, updated_at=datetime('now')`)
    .run(user.id, emergency, address, dob);
  send(res, 200, { ok: true, message: "Profile saved to database." });
});

/* =============================== REVIEWS ================================== */
router.post("/api/reviews", async (req, res) => {
  const user = requireAuth(req);
  if (!user) return unauthorized(res);
  const rating = Number(req.body.rating);
  const reviewText = String(req.body.review_text || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !reviewText || reviewText.length > 2000) return badRequest(res, "Provide a review and a rating from 1 to 5");
  const info = db.prepare("INSERT INTO reviews (name, rating, review_text) VALUES (?, ?, ?)").run(user.name, rating, reviewText);
  send(res, 201, { ok: true, review_id: Number(info.lastInsertRowid) });
});

router.get("/api/reviews", async (req, res) => {
  const rows = db.prepare("SELECT id, name, rating, review_text AS text, created_at FROM reviews ORDER BY id DESC LIMIT 50").all();
  send(res, 200, { reviews: rows });
});

/* ============================== HOSPITALS ================================= */

router.get("/api/hospitals", async (req, res) => {
  const rows = db.prepare("SELECT id,name,address,phone,type,note FROM hospitals ORDER BY name").all();
  send(res, 200, { hospitals: rows });
});

/* ================================ DOCTORS ================================= */

router.get("/api/doctors", async (req, res, query) => {
  let sql = `SELECT d.id, u.name, d.specialty, d.available, h.name AS hospital_name
             FROM doctors d JOIN users u ON u.id = d.user_id
             LEFT JOIN hospitals h ON h.id = d.hospital_id WHERE 1=1`;
  const params = [];
  if (query.get("available") === "1") sql += " AND d.available = 1";
  if (query.get("specialty")) { sql += " AND LOWER(d.specialty) = LOWER(?)"; params.push(query.get("specialty")); }
  if (query.get("q")) {
    const term = `%${String(query.get("q")).slice(0, 100)}%`;
    sql += " AND (LOWER(u.name) LIKE LOWER(?) OR LOWER(d.specialty) LIKE LOWER(?) OR LOWER(COALESCE(h.name,'')) LIKE LOWER(?) OR LOWER(COALESCE(h.address,'')) LIKE LOWER(?))";
    params.push(term, term, term, term);
  }
  if (query.get("hospital")) { sql += " AND LOWER(COALESCE(h.name,'')) LIKE LOWER(?)"; params.push(`%${String(query.get("hospital")).slice(0,100)}%`); }
  sql += " ORDER BY d.available DESC, u.name";
  const rows = db.prepare(sql).all(...params);
  send(res, 200, { doctors: rows });
});

router.post("/api/doctors/availability", async (req, res) => {
  const user = requireAuth(req);
  if (!user) return unauthorized(res);
  if (user.role !== "doctor") return forbidden(res);
  const available = req.body.available ? 1 : 0;
  db.prepare("UPDATE doctors SET available = ?, updated_at = datetime('now') WHERE user_id = ?").run(available, user.id);
  send(res, 200, { ok: true, available: !!available });
});

router.get("/api/doctors/mine/appointments", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "doctor") return forbidden(res);
  const doctor = db.prepare("SELECT id FROM doctors WHERE user_id = ?").get(user.id);
  const rows = db.prepare(
    `SELECT a.id, a.appt_date, a.appt_time, a.status, p.name AS patient_name, p.phone AS patient_phone
     FROM appointments a JOIN users p ON p.id = a.patient_id
     WHERE a.doctor_id = ? ORDER BY a.appt_date, a.appt_time`
  ).all(doctor.id);
  send(res, 200, { appointments: rows });
});

router.post("/api/appointments/:id/status", async (req, res, query, params) => {
  const user = requireAuth(req);
  if (!user || user.role !== "doctor") return forbidden(res);
  const status = req.body.status;
  if (!["confirmed", "cancelled", "completed"].includes(status)) return badRequest(res, "Invalid status");
  const doctor = db.prepare("SELECT id FROM doctors WHERE user_id = ?").get(user.id);
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(params.id);
  if (!appt || appt.doctor_id !== doctor.id) return notFound(res);
  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, params.id);
  send(res, 200, { ok: true });
});

/* =============================== APPOINTMENTS (patient side) ============== */

router.post("/api/appointments", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "patient") return forbidden(res, "Only patients can book appointments");
  const { doctor_id, appt_date, appt_time } = req.body;
  if (!doctor_id || !appt_date || !appt_time) return badRequest(res, "doctor_id, appt_date and appt_time are required");
  const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(doctor_id);
  if (!doctor) return notFound(res, "Doctor not found");
  if (!doctor.available) return badRequest(res, "This doctor is not currently accepting appointments.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(appt_date)) || !/^\d{2}:\d{2}$/.test(String(appt_time))) return badRequest(res, "Use a valid appointment date and time.");
  if (appt_date < new Date().toISOString().slice(0, 10)) return badRequest(res, "Appointment date cannot be in the past.");
  // A doctor cannot have two active appointments at the same date/time.
  const clash = db.prepare(
    "SELECT id FROM appointments WHERE doctor_id = ? AND appt_date = ? AND appt_time = ? AND status IN ('pending','confirmed') LIMIT 1"
  ).get(doctor_id, appt_date, appt_time);
  if (clash) return badRequest(res, "This time slot is already booked. Please choose another time.");
  const info = db.prepare(
    "INSERT INTO appointments (patient_id,doctor_id,appt_date,appt_time) VALUES (?,?,?,?)"
  ).run(user.id, doctor_id, appt_date, appt_time);
  send(res, 201, { ok: true, appointment_id: Number(info.lastInsertRowid), status: "pending" });
});

router.get("/api/appointments/mine", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "patient") return forbidden(res);
  const rows = db.prepare(
    `SELECT a.id, a.appt_date, a.appt_time, a.status, u.name AS doctor_name, d.specialty
     FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN users u ON u.id = d.user_id
     WHERE a.patient_id = ? ORDER BY a.appt_date DESC`
  ).all(user.id);
  send(res, 200, { appointments: rows });
});

/* =============================== AMBULANCE ================================= */

router.post("/api/ambulance/availability", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "driver") return forbidden(res);
  const available = req.body.available ? 1 : 0;
  db.prepare("UPDATE drivers SET available = ?, updated_at = datetime('now') WHERE user_id = ?").run(available, user.id);
  send(res, 200, { ok: true, available: !!available });
});

router.post("/api/ambulance/request", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "patient") return forbidden(res, "Only patients can request an ambulance");
  const location = String(req.body.location || "").trim();
  const emergency_type = String(req.body.emergency_type || "").trim();
  if (!location || !emergency_type) return badRequest(res, "location and emergency_type are required");
  if (location.length > 500 || emergency_type.length > 100) return badRequest(res, "Location or emergency type is too long");

  // Safety: do not claim dispatch until provider verification, acknowledgement,
  // and reliable notification delivery are implemented and tested.
  const info = db.prepare(
    "INSERT INTO ambulance_requests (patient_id,driver_id,location,emergency_type,status) VALUES (?,?,?,?,'pending')"
  ).run(user.id, null, location, emergency_type);
  send(res, 201, {
    ok: true,
    request_id: Number(info.lastInsertRowid),
    status: "pending",
    driver: null,
    eta_minutes: null,
    message: "Request saved to CareConnect for prototype tracking. No verified ambulance has been dispatched or notified. For a real emergency in India, call 112."
  });
});

router.get("/api/ambulance/mine", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "patient") return forbidden(res);
  const rows = db.prepare(
    `SELECT r.id, r.location, r.emergency_type, r.status, r.created_at,
            u.name AS driver_name, u.phone AS driver_phone
     FROM ambulance_requests r LEFT JOIN drivers d ON d.id = r.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE r.patient_id = ? ORDER BY r.created_at DESC`
  ).all(user.id);
  send(res, 200, { requests: rows });
});

router.get("/api/ambulance/mine/driver", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "driver") return forbidden(res);
  const driver = db.prepare("SELECT id, available FROM drivers WHERE user_id = ?").get(user.id);
  const rows = db.prepare(
    `SELECT r.id, r.location, r.emergency_type, r.status, r.created_at, p.name AS patient_name, p.phone AS patient_phone
     FROM ambulance_requests r JOIN users p ON p.id = r.patient_id
     WHERE r.driver_id = ? ORDER BY r.created_at DESC`
  ).all(driver.id);
  send(res, 200, { available: !!driver.available, requests: rows });
});

router.post("/api/ambulance/requests/:id/complete", async (req, res, query, params) => {
  const user = requireAuth(req);
  if (!user || user.role !== "driver") return forbidden(res);
  const driver = db.prepare("SELECT id FROM drivers WHERE user_id = ?").get(user.id);
  const reqRow = db.prepare("SELECT * FROM ambulance_requests WHERE id = ?").get(params.id);
  if (!reqRow || reqRow.driver_id !== driver.id) return notFound(res);
  db.prepare("UPDATE ambulance_requests SET status = 'completed' WHERE id = ?").run(params.id);
  db.prepare("UPDATE drivers SET available = 1, updated_at = datetime('now') WHERE id = ?").run(driver.id);
  send(res, 200, { ok: true });
});

/* ================================ PHARMACY ================================= */

router.get("/api/pharmacy/medicines", async (req, res, query) => {
  let sql = `SELECT pm.id, pm.medicine_name, pm.stock_qty, pm.price, ph.shop_name, ph.address
             FROM pharmacy_medicines pm JOIN pharmacies ph ON ph.id = pm.pharmacy_id WHERE 1=1`;
  const params = [];
  const search = query.get("search");
  if (search) { sql += " AND pm.medicine_name LIKE ?"; params.push(`%${search}%`); }
  sql += " ORDER BY pm.medicine_name";
  const rows = db.prepare(sql).all(...params);
  send(res, 200, { medicines: rows });
});

router.post("/api/pharmacy/medicines", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "pharmacy") return forbidden(res);
  const pharmacy = db.prepare("SELECT id FROM pharmacies WHERE user_id = ?").get(user.id);
  const { medicine_name, stock_qty, price } = req.body;
  if (!medicine_name || stock_qty == null) return badRequest(res, "medicine_name and stock_qty are required");
  const existing = db.prepare("SELECT id FROM pharmacy_medicines WHERE pharmacy_id = ? AND medicine_name = ?")
    .get(pharmacy.id, medicine_name);
  if (existing) {
    db.prepare("UPDATE pharmacy_medicines SET stock_qty = ?, price = ?, updated_at = datetime('now') WHERE id = ?")
      .run(stock_qty, price || null, existing.id);
  } else {
    db.prepare("INSERT INTO pharmacy_medicines (pharmacy_id,medicine_name,stock_qty,price) VALUES (?,?,?,?)")
      .run(pharmacy.id, medicine_name, stock_qty, price || null);
  }
  send(res, 200, { ok: true });
});

router.get("/api/pharmacy/mine", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "pharmacy") return forbidden(res);
  const pharmacy = db.prepare("SELECT id, shop_name, address FROM pharmacies WHERE user_id = ?").get(user.id);
  const meds = db.prepare("SELECT id,medicine_name,stock_qty,price FROM pharmacy_medicines WHERE pharmacy_id = ? ORDER BY medicine_name").all(pharmacy.id);
  send(res, 200, { pharmacy, medicines: meds });
});

/* =============================== BLOOD BANK ================================ */

router.get("/api/bloodbank/stock", async (req, res, query) => {
  let sql = `SELECT bs.id, bs.blood_group, bs.units_available, bb.bank_name, bb.address
             FROM blood_stock bs JOIN blood_banks bb ON bb.id = bs.blood_bank_id WHERE 1=1`;
  const params = [];
  const group = query.get("blood_group");
  if (group) { sql += " AND bs.blood_group = ?"; params.push(group); }
  sql += " ORDER BY bb.bank_name, bs.blood_group";
  const rows = db.prepare(sql).all(...params);
  send(res, 200, { stock: rows });
});

router.post("/api/bloodbank/stock", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "bloodbank") return forbidden(res);
  const bank = db.prepare("SELECT id FROM blood_banks WHERE user_id = ?").get(user.id);
  const { blood_group, units_available } = req.body;
  const validGroups = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
  if (!validGroups.includes(blood_group) || units_available == null) return badRequest(res, "Valid blood_group and units_available are required");
  db.prepare(
    `INSERT INTO blood_stock (blood_bank_id,blood_group,units_available) VALUES (?,?,?)
     ON CONFLICT(blood_bank_id,blood_group) DO UPDATE SET units_available = excluded.units_available, updated_at = datetime('now')`
  ).run(bank.id, blood_group, units_available);
  send(res, 200, { ok: true });
});

router.get("/api/bloodbank/mine", async (req, res) => {
  const user = requireAuth(req);
  if (!user || user.role !== "bloodbank") return forbidden(res);
  const bank = db.prepare("SELECT id, bank_name, address FROM blood_banks WHERE user_id = ?").get(user.id);
  const stock = db.prepare("SELECT blood_group, units_available FROM blood_stock WHERE blood_bank_id = ? ORDER BY blood_group").all(bank.id);
  send(res, 200, { bank, stock });
});

/* ================================= REVIEWS ================================= */

router.get("/api/reviews", async (req, res) => {
  const rows = db.prepare("SELECT name,rating,review_text,created_at FROM reviews ORDER BY created_at DESC LIMIT 20").all();
  send(res, 200, { reviews: rows });
});

router.post("/api/reviews", async (req, res) => {
  const { name, rating, review_text } = req.body;
  if (!name || !rating || !review_text) return badRequest(res, "name, rating and review_text are required");
  if (rating < 1 || rating > 5) return badRequest(res, "rating must be 1-5");
  db.prepare("INSERT INTO reviews (name,rating,review_text) VALUES (?,?,?)").run(name, rating, review_text);
  send(res, 201, { ok: true });
});

/* ============================ static file serving =========================== */

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT_DIR, decodeURIComponent(pathname));
  if (pathname === "/") filePath = path.join(ROOT_DIR, "index.html");
  if (!filePath.startsWith(ROOT_DIR)) return notFound(res); // block path traversal
  fs.readFile(filePath, (err, data) => {
    if (err) return notFound(res, "File not found");
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

/* =================================== server ================================= */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const match = router.match(req.method, url.pathname);
  if (match) {
    try {
      req.body = (req.method === "POST" || req.method === "PUT") ? await readJsonBody(req) : {};
      await match.handler(req, res, url.searchParams, match.params);
    } catch (err) {
      console.error(err);
      send(res, 400, { error: err.message || "Bad request" });
    }
    return;
  }

  if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
    return serveStatic(req, res, url.pathname);
  }

  notFound(res);
});

server.listen(PORT, () => {
  console.log(`Care Connect server running → http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${ROOT_DIR}`);
});
