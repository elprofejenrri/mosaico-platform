import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
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
        navigate("/admin", { replace: true });
      } catch (error) {
        console.error("Auth callback failed", error);
        navigate("/", { replace: true });
      }
    })();
  }, [checkAuth, navigate]);

  return <div className="min-h-[40vh] flex items-center justify-center text-[#5C6680]">...</div>;
}
