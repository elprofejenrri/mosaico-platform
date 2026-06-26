import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";

const DAY_MS = 86400000;
const fmt = (d) => d.toISOString().slice(0, 10);

const dayLabel = (date, lang) => {
  const wk = lang === "en"
    ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    : ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  return wk[date.getDay()];
};

const monthLabel = (date, lang) => {
  return date.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "short" });
};

/**
 * Horizontal date strip showing the next N days with availability counts.
 * Clicking a date sends user to /book?date=YYYY-MM-DD.
 */
export const ScheduleStrip = ({ days = 14 }) => {
  const { lang } = useApp();
  const [slots, setSlots] = useState([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    api.get("/availability").then((r) => setSlots(r.data || [])).catch(() => {});
  }, []);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const counts = useMemo(() => {
    const map = {};
    for (const s of slots) {
      map[s.date] = (map[s.date] || 0) + 1;
    }
    return map;
  }, [slots]);

  const dates = useMemo(() => {
    const out = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() + (i + offset) * DAY_MS);
      out.push(d);
    }
    return out;
  }, [today, offset, days]);

  const visible = dates.slice(0, 7);

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12" data-testid="schedule-strip">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DA89F] mb-3 font-semibold flex items-center gap-2">
            <CalIcon size={12} />
            {lang === "en" ? "Pick a date" : "Elige una fecha"}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl max-w-2xl leading-tight">
            {lang === "en" ? "When works for you?" : "¿Cuándo te queda bien?"}
          </h2>
          <p className="mt-3 text-[#5C6680]">
            {lang === "en"
              ? "Tap a day with classes available — we'll show you the times and you pick a teacher."
              : "Toca un día con clases disponibles — te mostramos los horarios y tú eliges profesor."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 7))}
            disabled={offset === 0}
            data-testid="strip-prev"
            className="w-10 h-10 rounded-full border border-[#EFE4D0] bg-white flex items-center justify-center hover:border-[#E8704C] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setOffset((o) => o + 7)}
            data-testid="strip-next"
            className="w-10 h-10 rounded-full border border-[#EFE4D0] bg-white flex items-center justify-center hover:border-[#E8704C]"
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {visible.map((d) => {
          const key = fmt(d);
          const count = counts[key] || 0;
          const isPast = d < today;
          const closed = d.getDay() === 0; // Sundays seeded as closed
          const dim = isPast || (closed && count === 0);
          const noSlots = count === 0;
          return (
            <Link
              key={key}
              to={dim || noSlots ? "#" : `/book?date=${key}`}
              onClick={(e) => { if (dim || noSlots) e.preventDefault(); }}
              data-testid={`strip-day-${key}`}
              aria-disabled={dim || noSlots}
              className={`block rounded-2xl p-4 text-center transition-all border ${
                dim
                  ? "bg-[#F3EEE3] border-transparent text-[#5C6680]/50 cursor-not-allowed"
                  : noSlots
                  ? "bg-white border-[#EFE4D0] text-[#5C6680]/60"
                  : "bg-white border-[#EFE4D0] hover:border-[#E8704C] hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">{dayLabel(d, lang)}</p>
              <p className={`font-display text-2xl mt-1 ${!dim && !noSlots ? "text-[#1F3B6E]" : ""}`}>
                {d.getDate()}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#5C6680] mt-1">{monthLabel(d, lang)}</p>
              <div className="mt-3">
                {noSlots ? (
                  <span className="text-[10px] text-[#5C6680]">{closed ? (lang === "en" ? "Closed" : "Cerrado") : "—"}</span>
                ) : (
                  <span className="inline-block text-[10px] uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-[#E0F2F0] text-[#2DA89F] font-semibold">
                    {count} {lang === "en" ? (count === 1 ? "slot" : "slots") : (count === 1 ? "horario" : "horarios")}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/book" data-testid="strip-cta">
          <Button variant="outline" className="rounded-full border-[#E8704C] text-[#E8704C] hover:bg-[#E8704C] hover:text-white px-6">
            {lang === "en" ? "Browse the full calendar" : "Ver calendario completo"}
          </Button>
        </Link>
      </div>
    </section>
  );
};
