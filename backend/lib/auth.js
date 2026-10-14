// lib/auth.js — password hashing (scrypt) + session tokens. No external deps.
"use strict";
const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.scryptSync(String(password), salt, 64).toString("hex");
  // timing-safe compare
  const a = Buffer.from(check, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = { hashPassword, verifyPassword, newToken };
