import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext";

const fmt = (d) => d.toISOString().slice(0, 10);

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const monthMatrix = (anchor) => {
  // returns 6 rows × 7 cols, Monday-first (shift Sunday from 0 to 6)
  const first = startOfMonth(anchor);
  const offset = (first.getDay() + 6) % 7; // days before to fill the row
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
};

/**
 * MonthCalendar — visual month view with slot counts per day.
 * Props:
 *  - value: Date|null            current selection
 *  - onSelect: (Date) => void
 *  - counts: { "YYYY-MM-DD": number }  slots available per date
 *  - minDate: Date               disable everything before (default today)
 */
export const MonthCalendar = ({ value, onSelect, counts = {}, minDate }) => {
  const { lang } = useApp();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const floor = minDate || today;
  const [anchor, setAnchor] = useState(() => startOfMonth(value || today));

  const cells = useMemo(() => monthMatrix(anchor), [anchor]);

  const weekdays = lang === "en"
    ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    : ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  const monthLabel = anchor.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" });
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="select-none" data-testid="month-calendar">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setAnchor((a) => addMonths(a, -1))}
          disabled={anchor <= startOfMonth(floor)}
          data-testid="cal-prev"
          className="w-9 h-9 rounded-full border border-[#EFE4D0] bg-white flex items-center justify-center hover:border-[#E8704C] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-display text-xl capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setAnchor((a) => addMonths(a, 1))}
          data-testid="cal-next"
          className="w-9 h-9 rounded-full border border-[#EFE4D0] bg-white flex items-center justify-center hover:border-[#E8704C]"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w) => (
          <div key={w} className="text-[10px] uppercase tracking-[0.18em] text-[#5C6680] font-semibold text-center py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const key = fmt(d);
          const count = counts[key] || 0;
          const isPast = d < floor;
          const isClosed = d.getDay() === 0; // Sunday closed by seed convention
          const noSlots = count === 0;
          const disabled = !inMonth || isPast || noSlots;
          const selected = sameDay(value, d);

          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onSelect && onSelect(d)}
              disabled={disabled}
              data-testid={`cal-day-${key}`}
              aria-label={`${key}${noSlots ? " no slots" : ` ${count} slots`}`}
              aria-pressed={selected}
              className={`group relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                !inMonth
                  ? "bg-transparent text-[#5C6680]/30 cursor-default"
                  : selected
                  ? "bg-[#E8704C] text-white shadow-md"
                  : disabled
                  ? "bg-[#F3EEE3]/40 text-[#5C6680]/40 cursor-not-allowed"
                  : "bg-white border border-[#EFE4D0] text-[#1F3B6E] hover:border-[#E8704C] hover:shadow-sm"
              }`}
            >
              <span className={`font-display ${selected ? "text-base" : "text-base"}`}>{d.getDate()}</span>
              {inMonth && !disabled && !selected && (
                <span className="absolute bottom-1.5 inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#2DA89F]" />
                  {count >= 3 && <span className="w-1 h-1 rounded-full bg-[#2DA89F]" />}
                  {count >= 6 && <span className="w-1 h-1 rounded-full bg-[#2DA89F]" />}
                </span>
              )}
              {inMonth && !disabled && selected && (
                <span className="absolute bottom-1 text-[9px] uppercase tracking-[0.15em] opacity-90">
                  {count} {lang === "en" ? (count === 1 ? "slot" : "slots") : (count === 1 ? "horario" : "horarios")}
                </span>
              )}
              {inMonth && isClosed && noSlots && !isPast && (
                <span className="absolute bottom-1 text-[8px] uppercase tracking-[0.1em] text-[#5C6680]/60">
                  {lang === "en" ? "Closed" : "Cerrado"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px] text-[#5C6680] flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-[#2DA89F]" />
            <span className="w-1 h-1 rounded-full bg-[#2DA89F]" />
            <span className="w-1 h-1 rounded-full bg-[#2DA89F]" />
          </span>
          {lang === "en" ? "More dots = more slots" : "Más puntos = más horarios"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#E8704C]" /> {lang === "en" ? "Selected" : "Seleccionado"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#F3EEE3]" /> {lang === "en" ? "Unavailable" : "No disponible"}
        </span>
      </div>
    </div>
  );
};
