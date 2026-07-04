import axios from "axios";
import { supabase } from "./supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use(async (cfg) => {
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
