import axios from "axios";
import { supabase } from "./supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
const REQUEST_ID_HEADER = "X-Request-ID";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use(async (cfg) => {
  cfg.headers[REQUEST_ID_HEADER] = cfg.headers[REQUEST_ID_HEADER] || `web_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const devAuth = process.env.REACT_APP_DEV_AUTH === "true";
  const devToken = devAuth ? localStorage.getItem("mosaico_dev_token") : null;
  if (devToken) {
    cfg.headers.Authorization = `Bearer ${devToken}`;
    return cfg;
  }
  const localToken = localStorage.getItem("mosaico_local_token");
  if (localToken) {
    cfg.headers.Authorization = `Bearer ${localToken}`;
    return cfg;
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data || {};
    error.appError = {
      code: data.code || "request_failed",
      message: data.message || data.detail || error.message || "Request failed.",
      details: data.details || {},
      requestId: data.requestId || error.response?.headers?.["x-request-id"],
      timestamp: data.timestamp || new Date().toISOString(),
    };
    return Promise.reject(error);
  }
);
