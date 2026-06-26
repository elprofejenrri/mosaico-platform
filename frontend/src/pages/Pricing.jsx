import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Check } from "lucide-react";

export default function Pricing() {
  const { t, lang } = useApp();
  const [products, setProducts] = useState([]);
  useEffect(() => { api.get("/products").then((r) => setProducts(r.data)).catch(() => {}); }, []);

  const groups = [
    { key: "trial", label: lang === "en" ? "Start here" : "Empieza aquí" },
    { key: "single", label: lang === "en" ? "Single classes" : "Clases sueltas" },
    { key: "package", label: lang === "en" ? "Packs (save more)" : "Paquetes (ahorra más)" },
    { key: "subscription", label: lang === "en" ? "Monthly" : "Mensual" },
  ];

  return (
    <div data-testid="pricing-page" className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-[#E8704C] mb-6">{t.pricing.eyebrow}</p>
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight max-w-3xl">{t.pricing.title}</h1>
      <p className="mt-6 text-lg text-[#5C6680] max-w-2xl">{t.pricing.subtitle}</p>

      <div className="mt-16 space-y-16">
        {groups.map((g) => {
          const list = products.filter((p) => p.type === g.key);
          if (list.length === 0) return null;
          return (
            <div key={g.key}>
              <h2 className="font-display text-2xl mb-6 border-l-2 border-[#E8704C] pl-4">{g.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {list.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`product-${p.id}`}
                    className={`relative bg-white border rounded-2xl p-8 flex flex-col ${p.popular ? "border-[#E8704C] shadow-sm" : "border-[#EFE4D0]"}`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-8 bg-[#E8704C] text-[#FBF7EE] text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                        {t.pricing.popular}
                      </span>
                    )}
                    <h3 className="font-display text-2xl">{lang === "en" ? p.name_en : p.name_es}</h3>
                    <p className="mt-3 text-sm text-[#5C6680] min-h-[3rem]">{lang === "en" ? p.description_en : p.description_es}</p>
                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="font-display text-5xl">${p.price_usd.toFixed(0)}</span>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#5C6680]">USD</span>
                    </div>
                    <ul className="mt-6 space-y-2 text-sm text-[#1F3B6E] flex-1">
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#FFC93C]" />{p.duration_min} min / {lang === "en" ? "lesson" : "clase"}</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#FFC93C]" />{p.sessions_included} {p.sessions_included > 1 ? t.pricing.includesPlural : t.pricing.includes}</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#FFC93C]" />Google Meet · {lang === "en" ? "calendar invite" : "invitación al calendario"}</li>
                    </ul>
                    <Link to={`/book/${p.id}`} data-testid={`book-${p.id}`} className="mt-8">
                      <Button className="w-full rounded-full bg-[#1F3B6E] text-[#FBF7EE] hover:bg-[#E8704C] hover:text-[#FBF7EE]">
                        {t.pricing.bookBtn}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
