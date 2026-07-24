import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { translations } from "../lib/i18n";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem("lily_lang");
    return stored === "es" || stored === "en" ? stored : "en";
  });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState({});

  const t = useMemo(() => {
    const base = translations[lang];
    const c = settings?.content || {};
    const heroOverrides = c.hero || {};
    const aboutOverrides = c.about || {};
    const footerOverrides = c.footer || {};

    return {
      ...base,
      hero: {
        ...base.hero,
        tag: heroOverrides[`tag_${lang}`] || base.hero.tag,
        subtitle: heroOverrides[`subtitle_${lang}`] || base.hero.subtitle,
        bubble: heroOverrides[`bubble_${lang}`] || base.hero.bubble,
        ctaPrimary: heroOverrides[`cta_primary_${lang}`] || base.hero.ctaPrimary,
        ctaSecondary: heroOverrides[`cta_secondary_${lang}`] || base.hero.ctaSecondary,
      },
      about: {
        ...base.about,
        eyebrow: aboutOverrides[`eyebrow_${lang}`] || base.about.eyebrow,
        title: aboutOverrides[`title_${lang}`] || base.about.title,
        body: aboutOverrides[`body_${lang}`] || base.about.body,
        stats: aboutOverrides.stats?.length
          ? aboutOverrides.stats.map((st) => ({ value: st.value, label: st[`label_${lang}`] || "" }))
          : null,
      },
      audiences: {
        ...base.audiences,
        items: c.audiences?.length
          ? c.audiences.map((a) => ({
              k: a.k || a.title_en?.toLowerCase()?.slice(0, 12),
              title: a[`title_${lang}`] || "",
              body: a[`body_${lang}`] || "",
              color: a.color || "#2DA89F",
            }))
          : base.audiences.items,
      },
      testimonials: {
        ...base.testimonials,
        items: c.testimonials?.length
          ? c.testimonials.map((it) => ({ q: it[`quote_${lang}`] || "", a: it.author || "" }))
          : base.testimonials.items,
      },
      faq: {
        ...base.faq,
        items: c.faq?.length
          ? c.faq.map((it) => ({ q: it[`q_${lang}`] || "", a: it[`a_${lang}`] || "" }))
          : base.faq.items,
      },
      footer: {
        ...base.footer,
        chips: footerOverrides[`chips_${lang}`] || base.footer.chips,
      },
    };
  }, [lang, settings]);

  const checkAuth = useCallback(async () => {
    try {
      const loadCurrentUser = async () => {
        const r = await api.get("/auth/me");
        try {
          const access = await api.get("/auth/me/permissions");
          setUser({ ...r.data, access: access.data, permissions: access.data.permissions, grants: access.data.grants, schools: access.data.schools });
        } catch {
          setUser(r.data);
        }
      };
      const devAuth = process.env.REACT_APP_DEV_AUTH === "true";
      if (!devAuth) localStorage.removeItem("mosaico_dev_token");
      if (devAuth && localStorage.getItem("mosaico_dev_token")) {
        await loadCurrentUser();
        return;
      }
      if (localStorage.getItem("mosaico_local_token")) {
        await loadCurrentUser();
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setUser(null);
        return;
      }
      await loadCurrentUser();
    } catch {
      localStorage.removeItem("mosaico_local_token");
      localStorage.removeItem("mosaico_local_expires_at");
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const r = await api.get("/settings/public");
      setSettings(r.data || {});
    } catch {
      // Defaults from i18n keep the public site usable.
    }
  }, []);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  useEffect(() => {
    checkAuth();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) checkAuth();
      else {
        if (localStorage.getItem("mosaico_local_token") || localStorage.getItem("mosaico_dev_token")) return;
        setUser(null);
        setAuthLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [checkAuth]);

  useEffect(() => {
    localStorage.setItem("lily_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLanguage = (nextLang) => setLang(nextLang === "es" ? "es" : "en");
  const toggleLang = () => setLang((l) => (l === "en" ? "es" : "en"));

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("mosaico_dev_token");
    localStorage.removeItem("mosaico_local_token");
    localStorage.removeItem("mosaico_local_expires_at");
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AppContext.Provider value={{
      lang, setLang: setLanguage, toggleLang, t, user, setUser, authLoading,
      checkAuth, logout, settings, refreshSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

export const startGoogleAuth = async () => {
  localStorage.removeItem("mosaico_local_token");
  localStorage.removeItem("mosaico_local_expires_at");
  const devAuth = process.env.REACT_APP_DEV_AUTH === "true";
  if (devAuth) {
    localStorage.setItem("mosaico_dev_token", "dev-admin");
    window.location.href = "/admin";
    return { data: null, error: null };
  }

  if (!isSupabaseConfigured) {
    const error = new Error("Google sign-in is not configured. Please contact the MOSAICO administrator.");
    console.error("Google auth configuration error", error);
    toast.error(error.message);
    return { data: null, error };
  }

  try {
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (result.error) throw result.error;
    return result;
  } catch (error) {
    console.error("Google auth could not start", error);
    toast.error(error?.message || "Google sign-in could not start. Please try again.");
    return { data: null, error };
  }
};
