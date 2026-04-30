const API_URL = "https://finance-control-api-production.up.railway.app/api";

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (response.ok && data.token) {
    localStorage.setItem("token",        data.token);
    localStorage.setItem("user_id",      String(data.user_id || ""));
    localStorage.setItem("name",         data.name         || "");
    localStorage.setItem("role",         data.role         || "");
    localStorage.setItem("account_type", data.account_type || "business");
    localStorage.setItem("company_id",   String(data.company_id || ""));
    localStorage.setItem("company_name", data.company_name || "");
    localStorage.setItem("sv_plan",      data.plan         || "free");
    localStorage.setItem("sv_nicho",     data.nicho        || "generic");
  }
  return { ok: response.ok, data };
}

export async function registerUser(email, password, name, company_name, nicho = "generic") {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, company_name, nicho }),
  });
  return response;
}

export async function registerPersonalUser(email, password, name) {
  const response = await fetch(`${API_URL}/register/personal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, nicho: "generic" }),
  });
  return response;
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
    Authorization: `Bearer ${token}`,
  };
}

export async function getTransactions() {
  const response = await fetch(`${API_URL}/transactions`, {
    headers: getAuthHeaders(),
  });
  return response;
}

export async function createTransaction(data) {
  const response = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return response;
}

export async function updateTransaction(id, data) {
  const response = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return response;
}

export async function deleteTransaction(id) {
  const response = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return response;
}