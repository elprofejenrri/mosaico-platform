import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useApp();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    (async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        if (!code) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Missing auth session");
        }
        await checkAuth();
        const access = await api.get("/auth/me/permissions");
        const roles = new Set(access.data?.roles || []);
        const destination = roles.has("administrador_sitio") ? "/admin"
          : roles.has("finanzas") ? "/finance"
          : roles.has("administrador_escolar") ? "/school-admin"
          : roles.has("profesor") ? "/teacher"
          : roles.has("tutor_padre") ? "/tutor"
          : "/student";
        navigate(destination, { replace: true });
      } catch (error) {
        console.error("Auth callback failed", error);
        toast.error(error?.message || "Google sign-in could not be completed.");
        navigate("/login", { replace: true });
      }
    })();
  }, [checkAuth, navigate]);

  return <div className="min-h-[40vh] flex items-center justify-center text-[#5C6680]">...</div>;
}
