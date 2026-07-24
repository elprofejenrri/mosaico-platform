import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Globe, BookOpen, ChevronDown, UserCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { MosaicoLogo } from "./MosaicoLogo";
import { canAccessPortal, isTechnicalUser } from "../lib/access";
import MobileWorkspaceHeader from "./mobile/MobileWorkspaceHeader";

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
    finance: "Finance",
    profile: "Profile",
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
    finance: "Finanzas",
    profile: "Perfil",
  },
};

export const Navbar = () => {
  const { t, lang, setLang, user, logout } = useApp();
  const navigate = useNavigate();
  const loc = useLocation();
  const technicalUser = isTechnicalUser(user);
  const labels = navLabels[lang] || navLabels.en;
  const profileOptions = [
    { id: "student", path: "/student", label: labels.client },
    { id: "tutor", path: "/tutor", label: labels.tutor },
    { id: "teacher", path: "/teacher", label: labels.teacher },
    { id: "schoolAdmin", path: "/school-admin", label: labels.schoolAdmin },
    { id: "finance", path: "/finance", label: labels.finance },
    { id: "admin", path: "/admin", label: labels.administrative },
  ].filter((profile) => user && canAccessPortal(user, profile.id));
  const activeProfile = profileOptions.find((profile) =>
    loc.pathname === profile.path || loc.pathname.startsWith(`${profile.path}/`)
  )?.id || profileOptions[0]?.id || "";

  const navLink = (to, label, testid) => (
    <Link
      key={to}
      to={to}
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
          onClick={() => setLang(item)}
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

  const profileSelector = (mobile = false) => {
    if (!user || profileOptions.length === 0) return null;
    const selectId = mobile ? "nav-profile-selector-mobile" : "nav-profile-selector";
    return (
      <div className={`relative ${mobile ? "w-full" : "min-w-40"}`}>
        <label htmlFor={selectId} className="sr-only">{labels.profile}</label>
        <select
          id={selectId}
          value={activeProfile}
          onChange={(event) => {
            const profile = profileOptions.find((item) => item.id === event.target.value);
            if (profile) navigate(profile.path);
          }}
          data-testid={mobile ? "nav-profile-selector-m" : "nav-profile-selector"}
          className={`h-10 w-full appearance-none rounded-md border border-[#EFE4D0] bg-white px-3 pr-9 text-sm font-semibold outline-none transition-colors focus:border-[#1F3B6E] focus:ring-2 focus:ring-[#1F3B6E]/15 ${
            activeProfile ? "text-[#E8704C]" : "text-[#1F3B6E]"
          }`}
          aria-label={labels.profile}
        >
          {profileOptions.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6680]" size={16} aria-hidden="true" />
      </div>
    );
  };

  const fallbackTitle = loc.pathname === "/profile"
    ? labels.profile
    : loc.pathname === "/login"
      ? t.nav.signIn
      : labels.platform;

  const mobileNavigation = (
    <div className="grid gap-4">
      {navLink("/", labels.platform, "nav-home-m")}
      {profileSelector(true)}
      {languageSwitch(true)}
      {user ? (
        <>
          <Link to="/dashboard" data-mobile-drawer-close="true">{t.nav.dashboard}</Link>
          <Link to="/profile" className="flex min-h-11 items-center gap-2" data-mobile-drawer-close="true"><UserCircle size={16} />{labels.profile}</Link>
          {["admin", "administrador_sitio", "administrador_profesor", "editor_cms"].includes(user.role) && <Link to="/admin" data-mobile-drawer-close="true">{t.nav.admin}</Link>}
          {technicalUser && <Link to="/technical/wiki" className="flex min-h-11 items-center gap-2" data-mobile-drawer-close="true"><BookOpen size={16} />{labels.technicalWiki}</Link>}
          <Button
            onClick={async () => { await logout(); navigate("/"); }}
            variant="outline"
            data-testid="logout-btn-m"
            data-mobile-drawer-close="true"
          >
            {t.nav.signOut}
          </Button>
        </>
      ) : (
        <Button onClick={() => navigate("/login")} data-testid="nav-signin-btn-m" data-mobile-drawer-close="true" className="bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630]">
          {t.nav.signIn}
        </Button>
      )}
    </div>
  );

  return (
    <header
      data-testid="navbar"
      className="fixed top-0 left-0 right-0 z-50 border-b border-[#EFE4D0]/60 bg-[#FBF7EE]/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
    >
      <MobileWorkspaceHeader fallbackNavigation={mobileNavigation} fallbackTitle={fallbackTitle} />
      <div className="mx-auto hidden h-16 max-w-7xl items-center justify-between px-6 lg:flex lg:px-10">
        <MosaicoLogo size="text-2xl" />

        <nav className="flex items-center gap-5" aria-label="Primary navigation">
          {navLink("/", labels.platform, "nav-home")}
          {profileSelector()}
        </nav>

        <div className="flex items-center gap-3">
          {languageSwitch()}
          {user ? (
            <>
              <Link to="/dashboard" data-testid="nav-dashboard">
                <Button variant="ghost" className="text-[#1F3B6E] hover:bg-[#FFF0E6]">{t.nav.dashboard}</Button>
              </Link>
              <Link to="/profile" data-testid="nav-profile">
                <Button variant="ghost" className="text-[#1F3B6E] hover:bg-[#FFF0E6]">
                  <UserCircle size={16} className="mr-2" />{labels.profile}
                </Button>
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

      </div>
    </header>
  );
};
