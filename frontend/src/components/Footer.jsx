import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { MosaicoMark } from "./MosaicoLogo";

export const Footer = () => {
  const { t } = useApp();
  return (
    <footer data-testid="footer" className="mt-32 border-t border-[#EFE4D0] bg-[#FFF0E6]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <MosaicoMark className="text-3xl mb-3" />
          <p className="text-sm text-[#5C6680] max-w-xs mt-3">{t.footer.tagline}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-[#E8704C] mt-3 font-semibold">{t.footer.chips}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <Link to="/pricing" className="hover:text-[#E8704C] transition-colors">{t.nav.pricing}</Link>
          <Link to="/blog" className="hover:text-[#E8704C] transition-colors">{t.nav.blog}</Link>
          <Link to="/faq" className="hover:text-[#E8704C] transition-colors">{t.nav.faq}</Link>
          <Link to="/dashboard" className="hover:text-[#E8704C] transition-colors">{t.nav.dashboard}</Link>
        </div>
        <div className="text-xs text-[#5C6680] md:text-right">
          <p>© {new Date().getFullYear()} MOSAICO</p>
          <p className="mt-2 italic">{t.footer.made}</p>
        </div>
      </div>
    </footer>
  );
};
