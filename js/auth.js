// Care Connect frontend authentication helper.
"use strict";

function getCareConnectToken() {
  return localStorage.getItem("careconnect_token");
}

function getCareConnectUser() {
  try { return JSON.parse(localStorage.getItem("careconnect_user") || "null"); }
  catch { return null; }
}

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getCareConnectToken();
  if (token) headers.set("Authorization", "Bearer " + token);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, {...options, headers});
}

function logoutCareConnect() {
  const token = getCareConnectToken();
  if (token) {
    fetch("/api/auth/logout", {
      method: "POST",
      headers: {"Authorization": "Bearer " + token}
    }).catch(() => {});
  }
  localStorage.removeItem("careconnect_token");
  localStorage.removeItem("careconnect_user");
  window.location.href = "index.html";
}

async function requireCareConnectAuth() {
  const token = getCareConnectToken();
  if (!token) {
    window.location.href = "index.html";
    return null;
  }
  try {
    const response = await apiFetch("/api/auth/me");
    if (!response.ok) throw new Error("Session expired");
    const data = await response.json();
    localStorage.setItem("careconnect_user", JSON.stringify(data.user));
    return data.user;
  } catch {
    localStorage.removeItem("careconnect_token");
    localStorage.removeItem("careconnect_user");
    window.location.href = "index.html";
    return null;
  }
}
