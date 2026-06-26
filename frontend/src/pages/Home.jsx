import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { ArrowRight, MessageCircle, Heart, BookOpen, Globe2, Star } from "lucide-react";
import { ScheduleStrip } from "../components/ScheduleStrip";
// Sun-on-open-book hero illustration (inline SVG, MOSAICO mark)
const HeroIllustration = () => (
  <svg viewBox="0 0 320 280" className="w-full max-w-md mx-auto" aria-hidden="true">
    {/* sun rays */}
    <g stroke="#F4C13D" strokeWidth="6" strokeLinecap="round">
      <line x1="160" y1="20" x2="160" y2="40" />
      <line x1="100" y1="40" x2="112" y2="55" />
      <line x1="220" y1="40" x2="208" y2="55" />
      <line x1="60" y1="90" x2="82" y2="98" />
      <line x1="260" y1="90" x2="238" y2="98" />
      <line x1="55" y1="140" x2="78" y2="140" />
      <line x1="265" y1="140" x2="242" y2="140" />
    </g>
    {/* sun face */}
    <circle cx="160" cy="120" r="58" fill="#F4C13D" />
    <circle cx="142" cy="118" r="3" fill="#1F3B6E" />
    <circle cx="178" cy="118" r="3" fill="#1F3B6E" />
    <circle cx="135" cy="132" r="6" fill="#E8704C" opacity="0.55" />
    <circle cx="185" cy="132" r="6" fill="#E8704C" opacity="0.55" />
    <path d="M142 138 Q160 158 178 138" stroke="#1F3B6E" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* open book pages */}
    <path d="M40 220 Q160 180 280 220 L280 250 Q160 220 40 250 Z" fill="#2DA89F" />
    <path d="M50 215 Q160 178 270 215 L270 240 Q160 215 50 240 Z" fill="#8AD3CC" />
    <path d="M160 178 L160 235" stroke="#1F3B6E" strokeWidth="1.5" opacity="0.4" />
  </svg>
);

const SpeechBubble = ({ children }) => (
  <div className="relative inline-block">
    <div className="bg-[#E8704C] text-white font-display text-lg sm:text-xl px-5 py-3 rounded-2xl shadow-md">{children}</div>
    <div className="absolute -bottom-2 left-6 w-4 h-4 bg-[#E8704C] rotate-45" aria-hidden="true" />
  </div>
);

const PILLAR_ICONS = {
  speak: { icon: MessageCircle, color: "#2DA89F", bg: "#E0F2F0" },
  connect: { icon: Heart, color: "#E8704C", bg: "#FFE8DC" },
  learn: { icon: BookOpen, color: "#4FA85F", bg: "#E2F2E5" },
  explore: { icon: Globe2, color: "#4A90D9", bg: "#DEEAF8" },
  grow: { icon: Star, color: "#F4C13D", bg: "#FBEBC3" },
};

export default function Home() {
  const { t, lang } = useApp();
  const [products, setProducts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  useEffect(() => { api.get("/products").then((r) => setProducts(r.data)).catch(() => {}); }, []);
  useEffect(() => { api.get("/teachers").then((r) => setTeachers(r.data)).catch(() => {}); }, []);
  const popular = products.find((p) => p.popular) || products[0];

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-grid" aria-hidden="true" />
        <div aria-hidden="true" className="absolute top-32 right-20 w-3 h-3 rounded-full bg-[#E8704C] hidden lg:block" />
        <div aria-hidden="true" className="absolute bottom-32 left-12 w-4 h-4 rounded-full bg-[#8B5BB8] hidden lg:block" />
        <div aria-hidden="true" className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-[#4A90D9] hidden lg:block" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-12 gap-12 items-center fade-up">
          <div className="lg:col-span-7">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#E8704C] mb-6 px-4 py-2 rounded-full bg-white border border-[#EFE4D0]" data-testid="hero-tag">
              {t.hero.tag}
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.06]">
              {t.hero.titleA}{" "}
              <span className="font-script text-[#E8704C]">{t.hero.titleScript}</span>{" "}
              <span className="text-[#2DA89F]">{t.hero.titleB}</span>{" "}
              <span className="accent-underline">{t.hero.titleUnderlined}</span>.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-[#5C6680] max-w-2xl leading-relaxed">{t.hero.subtitle}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/book/trial" data-testid="hero-cta-primary">
                <Button className="rounded-full bg-[#E8704C] text-white hover:bg-[#C95630] hover:text-white px-8 py-7 text-base font-semibold shadow-lg shadow-[#E8704C]/25">
                  {t.hero.ctaPrimary} <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link to="/pricing" data-testid="hero-cta-secondary">
                <Button variant="outline" className="rounded-full bg-white border-[#EFE4D0] text-[#1F3B6E] hover:bg-[#1F3B6E] hover:text-white px-8 py-7 text-base font-semibold">
                  {t.hero.ctaSecondary}
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-4 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] text-[#5C6680] font-semibold">{lang === "en" ? "Online · Flexible · Personalized" : "En línea · Flexible · Personalizado"}</span>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="absolute -top-2 right-2 z-10">
              <SpeechBubble>{t.hero.bubble}</SpeechBubble>
            </div>
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* SCHEDULE STRIP */}
      <ScheduleStrip days={14} />

      {/* PILLARS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-[#E8704C] mb-6 font-semibold">{t.pillars.eyebrow}</p>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl max-w-3xl leading-tight">{t.pillars.title}</h2>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
          {t.pillars.items.map((p) => {
            const cfg = PILLAR_ICONS[p.k];
            const Icon = cfg.icon;
            return (
              <div key={p.k} data-testid={`pillar-${p.k}`} className="bg-white border border-[#EFE4D0] rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon size={24} style={{ color: cfg.color }} />
                </div>
                <h3 className="mt-4 font-display text-lg">{p.title}</h3>
                <p className="mt-2 text-sm text-[#5C6680] leading-relaxed">{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#2DA89F] mb-6 font-semibold">{t.audiences.eyebrow}</p>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl max-w-3xl leading-tight">{t.audiences.title}</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.audiences.items.map((a) => (
            <div key={a.k} data-testid={`audience-${a.k}`} className="rounded-3xl p-10 text-white relative overflow-hidden" style={{ background: a.color }}>
              <div aria-hidden="true" className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15" />
              <h3 className="font-display text-2xl md:text-3xl relative">{a.title}</h3>
              <p className="mt-3 text-white/90 relative">{a.body}</p>
              <Link to="/pricing" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4 relative">{t.pricing.bookBtn} →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* TEACHERS */}
      {teachers.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-[#4FA85F] mb-6 font-semibold">{t.teachers.eyebrow}</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl max-w-3xl leading-tight">{t.teachers.title}</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((tch) => (
              <div key={tch.id} data-testid={`teacher-card-${tch.id}`} className="bg-white border border-[#EFE4D0] rounded-2xl p-6 flex flex-col items-start">
                {tch.picture ? (
                  <img src={tch.picture} alt={tch.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#FFF0E6] flex items-center justify-center font-display text-2xl text-[#E8704C]">{tch.name?.[0]}</div>
                )}
                <h3 className="mt-5 font-display text-xl">{tch.name}</h3>
                <p className="mt-3 text-sm text-[#5C6680] leading-relaxed">{lang === "en" ? tch.bio_en : tch.bio_es}</p>
                <Link to="/pricing" className="mt-5 text-xs uppercase tracking-[0.2em] font-semibold text-[#E8704C] hover:text-[#C95630]">{t.pricing.bookBtn} →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5">
          <img
            src="https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxmcmllbmRseSUyMGhpc3BhbmljJTIwd29tYW4lMjB0ZWFjaGVyJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzgxMzcxNDE0fDA&ixlib=rb-4.1.0&q=85"
            alt="Lily"
            className="w-full max-h-[70vh] object-cover rounded-3xl"
          />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8B5BB8] mb-6 font-semibold">{t.about.eyebrow}</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight">{t.about.title}</h2>
          <p className="mt-8 text-base md:text-lg text-[#5C6680] leading-relaxed">{t.about.body}</p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-[#EFE4D0] pt-8">
            {(t.about.stats && t.about.stats.length > 0 ? t.about.stats : [
              { value: "700+", label: lang === "en" ? "Students" : "Estudiantes", color: "#E8704C" },
              { value: "7", label: lang === "en" ? "Years" : "Años", color: "#2DA89F" },
              { value: "4.9", label: lang === "en" ? "Rating" : "Calificación", color: "#F4C13D" },
            ]).map((st, i) => (
              <div key={`${st.value}-${i}`}>
                <p className="font-display text-3xl" style={{ color: st.color || ["#E8704C","#2DA89F","#F4C13D"][i % 3] }}>{st.value}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#5C6680] mt-1 font-semibold">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR */}
      {popular && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div className="bg-[#E8704C] text-white p-10 md:p-16 rounded-3xl flex flex-col md:flex-row md:items-end md:justify-between gap-8 relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#F4C13D]" />
            <div aria-hidden="true" className="absolute bottom-6 right-1/3 w-6 h-6 rounded-full bg-white/30" />
            <div className="max-w-xl relative z-10">
              <p className="text-xs uppercase tracking-[0.3em] text-white/85 mb-4 font-semibold">{t.pricing.popular}</p>
              <h3 className="font-display text-3xl sm:text-4xl">{lang === "en" ? popular.name_en : popular.name_es}</h3>
              <p className="mt-4 text-white/90">{lang === "en" ? popular.description_en : popular.description_es}</p>
            </div>
            <div className="flex items-end gap-6 relative z-10">
              <div>
                <p className="font-display text-5xl">${popular.price_usd.toFixed(0)}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/85 font-semibold">USD</p>
              </div>
              <Link to={`/book/${popular.id}`} data-testid="popular-book">
                <Button className="rounded-full bg-[#F4C13D] hover:bg-white text-[#1F3B6E] hover:text-[#E8704C] px-7 py-6 font-semibold">{t.pricing.bookBtn}</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-[#4A90D9] mb-6 font-semibold">{t.testimonials.eyebrow}</p>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl max-w-2xl leading-tight">{t.testimonials.title}</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.testimonials.items.map((it) => (
            <blockquote key={it.a} className="bg-white border border-[#EFE4D0] rounded-2xl p-8" data-testid={`testimonial-${it.a}`}>
              <p className="font-script text-2xl text-[#1F3B6E] leading-snug">&ldquo;{it.q}&rdquo;</p>
              <footer className="mt-6 text-sm text-[#5C6680] font-semibold">{it.a}</footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
