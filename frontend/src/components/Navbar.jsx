import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Globe, GraduationCap, ShieldCheck, UserRound, Users, BookOpen, School } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { MosaicoLogo } from "./MosaicoLogo";
import { isTechnicalUser } from "../lib/access";

const navLabels = {
  en: {
    platform: "Platform",
    client: "Client",
    tutor: "Tutor",
    teacher: "Teacher",
    administrative: "Administrative",
    schoolAdmin: "School admin",
    wiki: "Wiki",
    technicalWiki: "Technical wiki",
  },
  es: {
    platform: "Plataforma",
    client: "Cliente",
    tutor: "Tutor",
    teacher: "Profesor",
    administrative: "Administrativo",
    schoolAdmin: "Admin escolar",
    wiki: "Wiki",
    technicalWiki: "Wiki tecnica",
  },
};

export const Navbar = () => {
  const { t, lang, setLang, user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  const technicalUser = isTechnicalUser(user);
  const labels = navLabels[lang] || navLabels.en;

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

  const languageSwitch = (mobile = false) => (
    <div className={`flex items-center gap-1 ${mobile ? "justify-start" : ""}`} aria-label="Language selector">
      <Globe size={14} className="text-[#5C6680]" aria-hidden="true" />
      {["en", "es"].map((item) => (
        <button
          key={item}
          type="button"
          data-testid={mobile ? `lang-${item}-m` : `lang-${item}`}
          onClick={() => {
            setLang(item);
            if (mobile) setOpen(false);
          }}
          className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
            lang === item ? "bg-[#1F3B6E] text-white" : "text-[#5C6680] hover:bg-[#FFF0E6] hover:text-[#1F3B6E]"
          }`}
          aria-pressed={lang === item}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <header
      data-testid="navbar"
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#FBF7EE]/80 border-b border-[#EFE4D0]/60"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <MosaicoLogo size="text-2xl" />

        <nav className="hidden md:flex items-center gap-8">
          {navLink("/", labels.platform, "nav-home")}
          {navLink("/student", labels.client, "nav-student")}
          {navLink("/tutor", labels.tutor, "nav-tutor")}
          {navLink("/teacher", labels.teacher, "nav-teacher")}
          {navLink("/school-admin", labels.schoolAdmin, "nav-school-admin")}
          {navLink("/admin", labels.administrative, "nav-admin")}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {languageSwitch()}
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
              {technicalUser && (
                <Link to="/technical/wiki" data-testid="nav-technical-wiki">
                  <Button variant="ghost" className="text-[#1F3B6E] hover:bg-[#FFF0E6]">
                    <BookOpen size={16} className="mr-2" />{labels.wiki}
                  </Button>
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
              onClick={() => navigate("/login")}
              data-testid="nav-signin-btn"
              className="bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630] hover:text-[#FBF7EE] rounded-full px-5"
            >
              {t.nav.signIn}
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
          {navLink("/", labels.platform, "nav-home-m")}
          <Link to="/student" onClick={() => setOpen(false)} className="flex items-center gap-2"><UserRound size={16} />{labels.client}</Link>
          <Link to="/tutor" onClick={() => setOpen(false)} className="flex items-center gap-2"><Users size={16} />{labels.tutor}</Link>
          <Link to="/teacher" onClick={() => setOpen(false)} className="flex items-center gap-2"><GraduationCap size={16} />{labels.teacher}</Link>
          <Link to="/school-admin" onClick={() => setOpen(false)} className="flex items-center gap-2"><School size={16} />{labels.schoolAdmin}</Link>
          <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2"><ShieldCheck size={16} />{labels.administrative}</Link>
          {languageSwitch(true)}
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)}>{t.nav.dashboard}</Link>
              {["admin", "administrador_sitio", "administrador_profesor", "editor_cms"].includes(user.role) && <Link to="/admin" onClick={() => setOpen(false)}>{t.nav.admin}</Link>}
              {technicalUser && <Link to="/technical/wiki" onClick={() => setOpen(false)} className="flex items-center gap-2"><BookOpen size={16} />{labels.technicalWiki}</Link>}
              <Button onClick={async () => { await logout(); setOpen(false); navigate("/"); }} variant="outline" data-testid="logout-btn-m">
                {t.nav.signOut}
              </Button>
            </>
          ) : (
            <Button onClick={() => { setOpen(false); navigate("/login"); }} data-testid="nav-signin-btn-m" className="bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630]">
              {t.nav.signIn}
            </Button>
          )}
        </div>
      )}
    </header>
  );
};
