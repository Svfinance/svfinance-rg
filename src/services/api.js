// src/services/api.js
// Render é o servidor principal agora — Railway foi removido.

const API_URL = "https://api.svfinance.com.br/api";

export async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    return res;
  } catch (err) {
    throw new Error("Serviço temporariamente indisponível. Tente novamente em instantes.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const response = await apiFetch("/login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (response.ok && data.token) {
    localStorage.setItem("token",        data.token);
    localStorage.setItem("user_id",      String(data.user_id      || ""));
    localStorage.setItem("name",         data.name                || "");
    localStorage.setItem("role",         data.role                || "");
    localStorage.setItem("account_type", data.account_type        || "business");
    localStorage.setItem("company_id",   String(data.company_id   || ""));
    localStorage.setItem("company_name", data.company_name        || "");
    localStorage.setItem("sv_plan",      data.plan                || "free");
    localStorage.setItem("sv_nicho",     data.nicho               || "generic");
  }
  return { ok: response.ok, data };
}

export async function registerUser(email, password, name, company_name, nicho = "generic") {
  return await apiFetch("/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, name, company_name, nicho }),
  });
}

export async function registerPersonalUser(email, password, name) {
  return await apiFetch("/register/personal", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, name, nicho: "generic" }),
  });
}

export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("name");
  localStorage.removeItem("role");
  localStorage.removeItem("account_type");
  localStorage.removeItem("company_id");
  localStorage.removeItem("company_name");
  localStorage.removeItem("sv_plan");
  localStorage.removeItem("sv_nicho");
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization:  `Bearer ${token}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSAÇÕES
// ─────────────────────────────────────────────────────────────────────────────

export async function getTransactions() {
  return await apiFetch("/transactions", { headers: getAuthHeaders() });
}

export async function createTransaction(data) {
  return await apiFetch("/transactions", {
    method:  "POST",
    headers: getAuthHeaders(),
    body:    JSON.stringify(data),
  });
}

export async function updateTransaction(id, data) {
  return await apiFetch(`/transactions/${id}`, {
    method:  "PUT",
    headers: getAuthHeaders(),
    body:    JSON.stringify(data),
  });
}

export async function deleteTransaction(id) {
  return await apiFetch(`/transactions/${id}`, {
    method:  "DELETE",
    headers: getAuthHeaders(),
  });
}