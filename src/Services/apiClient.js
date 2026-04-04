import { Cookies } from "./cookies";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const apiRequest = async (path, options = {}) => {
  const token =
    Cookies.get("access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    null;

  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload;
};
