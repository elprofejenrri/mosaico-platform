import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Sparkles } from "lucide-react";

const HIDDEN_PREFIXES = ["/book", "/admin", "/dashboard", "/payment"];

export const StickyBookCta = () => {
  const { lang } = useApp();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hide = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (hide || typeof document === "undefined") return null;

  return createPortal(
    <Link
      to="/book/trial"
      data-testid="sticky-book-cta"
      aria-label={lang === "en" ? "Book a trial class" : "Reservar clase de prueba"}
      style={{ position: "fixed", bottom: "5rem", right: "1.5rem", zIndex: 40 }}
      className={`flex items-center gap-2 px-5 py-3 rounded-full
        bg-[#E8704C] text-white font-semibold shadow-xl shadow-[#E8704C]/30
        hover:bg-[#C95630] transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}
    >
      <Sparkles size={16} aria-hidden="true" />
      <span className="text-sm">{lang === "en" ? "Book a trial — $9" : "Clase de prueba — $9"}</span>
    </Link>,
    document.body
  );
};
