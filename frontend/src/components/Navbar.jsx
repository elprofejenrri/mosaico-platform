import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Globe, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { MosaicoLogo } from "./MosaicoLogo";

export const Navbar = () => {
  const { t, lang, toggleLang, user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  const navLink = (to, label, testid) => (
    <Link
      key={to}
      to={to}
      onClick={() => setOpen(false)}
      data-testid={testid}
      className={`text-sm tracking-wide transition-colors hover:text-[#E8704C] ${loc.pathname === to ? "text-[#E8704C]" : "text-[#1F3B6E]"}`}
    >
      {label}
    </Link>
  );

  return (
    <header
      data-testid="navbar"
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#FBF7EE]/80 border-b border-[#EFE4D0]/60"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <MosaicoLogo size="text-2xl" />

        <nav className="hidden md:flex items-center gap-8">
          {navLink("/", "Platform", "nav-home")}
          {navLink("/student", "Student", "nav-student")}
          {navLink("/teacher", "Teacher", "nav-teacher")}
          {navLink("/admin", "Admin", "nav-admin")}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            data-testid="lang-toggle"
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5C6680] hover:text-[#1F3B6E] transition-colors"
            aria-label="Toggle language"
          >
            <Globe size={14} />
            {lang === "en" ? "EN · ES" : "ES · EN"}
          </button>
          {user ? (
            <>
              <Link to="/dashboard" data-testid="nav-dashboard">
                <Button variant="ghost" className="text-[#1F3B6E] hover:bg-[#FFF0E6]">{t.nav.dashboard}</Button>
              </Link>
              {["admin", "administrador_sitio", "administrador_profesor", "editor_cms"].includes(user.role) && (
                <Link to="/admin" data-testid="nav-admin">
                  <Button variant="ghost" className="text-[#E8704C] hover:bg-[#FFF0E6]">{t.nav.admin}</Button>
                </Link>
              )}
              <Button
                onClick={async () => { await logout(); navigate("/"); }}
                variant="outline"
                data-testid="logout-btn"
                className="border-[#EFE4D0] text-[#1F3B6E] hover:bg-[#FFF0E6]"
              >
                {t.nav.signOut}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate("/student")}
              data-testid="nav-signin-btn"
              className="bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630] hover:text-[#FBF7EE] rounded-full px-5"
            >
              Start demo
            </Button>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          data-testid="nav-mobile-toggle"
          className="md:hidden p-2"
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#EFE4D0] bg-[#FBF7EE] px-6 py-6 flex flex-col gap-4">
          {navLink("/", "Platform", "nav-home-m")}
          <Link to="/student" onClick={() => setOpen(false)} className="flex items-center gap-2"><UserRound size={16} />Student</Link>
          <Link to="/teacher" onClick={() => setOpen(false)} className="flex items-center gap-2"><GraduationCap size={16} />Teacher</Link>
          <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2"><ShieldCheck size={16} />Admin</Link>
          <button onClick={toggleLang} data-testid="lang-toggle-m" className="text-left text-xs uppercase tracking-[0.2em] text-[#5C6680]">
            {lang === "en" ? "EN · ES" : "ES · EN"}
          </button>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)}>{t.nav.dashboard}</Link>
              {["admin", "administrador_sitio", "administrador_profesor", "editor_cms"].includes(user.role) && <Link to="/admin" onClick={() => setOpen(false)}>{t.nav.admin}</Link>}
              <Button onClick={async () => { await logout(); setOpen(false); navigate("/"); }} variant="outline" data-testid="logout-btn-m">
                {t.nav.signOut}
              </Button>
            </>
          ) : (
            <Button onClick={() => { setOpen(false); navigate("/student"); }} data-testid="nav-signin-btn-m" className="bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630]">
              Start demo
            </Button>
          )}
        </div>
      )}
    </header>
  );
};
