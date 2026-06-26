import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const resolveUrl = (u) => (!u ? "" : u.startsWith("http") ? u : u.startsWith("/api/") ? `${BACKEND}${u}` : u);

// Mosaic 7-letter wordmark (default)
export const MosaicoMark = ({ className = "text-2xl", brand }) => {
  const { settings } = useApp();
  const name = brand || settings?.brand_name || "MOSAICO";
  return (
    <span className={`mosaico-letters font-display ${className} tracking-tight flex items-baseline`} aria-label={name}>
      {name.split("").map((c, i) => <span key={i}>{c}</span>)}
    </span>
  );
};

export const MosaicoLogo = ({ size = "text-2xl" }) => {
  const { settings } = useApp();
  const logoUrl = resolveUrl(settings?.logo_url);
  const brand = settings?.brand_name || "MOSAICO";
  return (
    <Link to="/" data-testid="logo-link" className="inline-flex items-center gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt={brand} className="h-8 w-auto" />
      ) : (
        <>
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <circle cx="14" cy="12" r="6" fill="#F4C13D" />
            <g stroke="#F4C13D" strokeWidth="1.6" strokeLinecap="round">
              <line x1="14" y1="1.5" x2="14" y2="4" />
              <line x1="14" y1="20" x2="14" y2="22.5" />
              <line x1="3.5" y1="12" x2="6" y2="12" />
              <line x1="22" y1="12" x2="24.5" y2="12" />
              <line x1="5.8" y1="3.8" x2="7.6" y2="5.6" />
              <line x1="20.4" y1="18.4" x2="22.2" y2="20.2" />
              <line x1="22.2" y1="3.8" x2="20.4" y2="5.6" />
            </g>
            <path d="M3 21 C8 18, 20 18, 25 21 L25 24 C20 21, 8 21, 3 24 Z" fill="#2DA89F" />
          </svg>
          <MosaicoMark className={size} brand={brand} />
        </>
      )}
    </Link>
  );
};
