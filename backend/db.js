// db.js — database layer for Care Connect backend.
// Uses Node's BUILT-IN node:sqlite module (needs Node v22.5+). No npm install
// is required just to run the database — zero native build headaches.
"use strict";
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

// For hosting, set CARECONNECT_DB_PATH to a writable persistent-disk path.
// Without a persistent disk, local SQLite data may be lost when the host restarts.
const DB_PATH = process.env.CARECONNECT_DB_PATH || path.join(__dirname, "careconnect.db");
fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
const isNewDatabase = !fs.existsSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('patient','doctor','driver','pharmacy','bloodbank')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'Private',
  note TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  hospital_id INTEGER REFERENCES hospitals(id),
  available INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number TEXT,
  area TEXT,
  available INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pharmacies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS pharmacy_medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  price REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blood_banks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS blood_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blood_bank_id INTEGER NOT NULL REFERENCES blood_banks(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL CHECK(blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  units_available INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(blood_bank_id, blood_group)
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appt_date TEXT NOT NULL,
  appt_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ambulance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(id),
  location TEXT NOT NULL,
  emergency_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','assigned','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  emergency_contact TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  date_of_birth TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Backward-compatible schema migration for databases created by older versions.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(column => column.name);
if (!userColumns.includes("email")) db.exec("ALTER TABLE users ADD COLUMN email TEXT");
// Enforce uniqueness for non-empty email addresses while allowing legacy NULL values.
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL AND email <> ''");

if (isNewDatabase) {
  console.log("New database detected — seeding demo + real Nanded hospital data...");
  require("./seed")(db);
}

module.exports = db;
