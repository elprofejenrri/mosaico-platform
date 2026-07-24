import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useApp, startGoogleAuth } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { MonthCalendar } from "../components/MonthCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Clock, Globe, User, Sparkles, Check } from "lucide-react";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Mexico_City", "America/Bogota", "America/Argentina/Buenos_Aires",
  "Europe/London", "Europe/Madrid", "Europe/Berlin", "Asia/Tokyo", "UTC",
];

const fmt = (d) => d.toISOString().slice(0, 10);

const Step = ({ number, label, done, active, children }) => (
  <div className={`bg-white border rounded-2xl p-6 lg:p-8 transition-all ${active ? "border-[#E8704C] shadow-sm" : done ? "border-[#EFE4D0]" : "border-[#EFE4D0] opacity-60"}`}>
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display ${done ? "bg-[#2DA89F] text-white" : active ? "bg-[#E8704C] text-white" : "bg-[#FFF0E6] text-[#5C6680]"}`}>
        {done ? <Check size={14} /> : number}
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-[#5C6680] font-semibold">{label}</p>
    </div>
    {children}
  </div>
);

export default function Book() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, lang, user } = useApp();

  // State
  const [products, setProducts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allSlots, setAllSlots] = useState([]);

  const [date, setDate] = useState(() => {
    const q = searchParams.get("date");
    if (q) { const d = new Date(`${q}T12:00:00`); if (!isNaN(d)) return d; }
    return null;
  });
  const [time, setTime] = useState(null);
  const [teacherId, setTeacherId] = useState("");
  const [chosenProductId, setChosenProductId] = useState(productId || "");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [loading, setLoading] = useState(false);
  const product = products.find((item) => item.id === chosenProductId);

  // Fetch reference data
  useEffect(() => { api.get("/products").then((r) => setProducts(r.data || [])); }, []);
  useEffect(() => {
    api.get("/teachers").then((r) => {
      setTeachers(r.data || []);
      if ((r.data || []).length === 1) setTeacherId(r.data[0].id);
    });
  }, []);
  useEffect(() => {
    api.get("/availability", {
      params: {
        ...(teacherId ? { teacher_id: teacherId } : {}),
        duration_min: product?.duration_min || 60,
      },
    })
      .then((r) => setAllSlots(r.data || []))
      .catch(() => setAllSlots([]));
  }, [teacherId, product?.duration_min]);

  // Reset downstream selections when date changes
  useEffect(() => { setTime(null); }, [date]);

  // Slots available for chosen date (and teacher if picked)
  const daySlots = React.useMemo(() => {
    if (!date) return [];
    const key = fmt(date);
    return allSlots
      .filter((s) => s.date === key && (!teacherId || !s.teacher_id || s.teacher_id === teacherId))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [date, allSlots, teacherId]);

  // Counts of slots per date for the month calendar
  const slotCounts = React.useMemo(() => {
    const map = {};
    for (const s of allSlots) {
      if (teacherId && s.teacher_id && s.teacher_id !== teacherId) continue;
      map[s.date] = (map[s.date] || 0) + 1;
    }
    return map;
  }, [allSlots, teacherId]);

  // Dates with availability (for calendar enabling) — kept for compatibility
  const datesWithSlots = React.useMemo(() => {
    const set = new Set();
    for (const s of allSlots) set.add(s.date);
    return set;
  }, [allSlots]);

  const selectedTeacher = teachers.find((tt) => tt.id === teacherId);

  // Step gating
  const stepDateDone = !!date;
  const stepTimeDone = !!time;
  const stepTeacherDone = teachers.length === 0 || !!teacherId;
  const stepProductDone = !!chosenProductId;
  const allDone = stepDateDone && stepTimeDone && stepTeacherDone && stepProductDone;

  const stepTimeActive = stepDateDone && !stepTimeDone;
  const stepTeacherActive = stepDateDone && stepTimeDone && !stepTeacherDone;
  const stepProductActive = stepDateDone && stepTimeDone && stepTeacherDone && !stepProductDone;

  const handlePay = async () => {
    if (!user) { startGoogleAuth(); return; }
    if (!allDone) { toast.error(lang === "en" ? "Complete each step" : "Completa cada paso"); return; }
    setLoading(true);
    try {
      const r = await api.post("/payments/checkout", {
        product_id: chosenProductId,
        origin_url: window.location.origin,
        date: fmt(date),
        time,
        timezone: tz,
        teacher_id: teacherId || null,
      });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.appError?.message || "Payment error");
      setLoading(false);
    }
  };

  const productGroups = React.useMemo(() => {
    const order = { trial: 0, single: 1, package: 2, subscription: 3 };
    const groups = {};
    for (const p of products) {
      const k = p.type || "other";
      (groups[k] ||= []).push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => (order[a] ?? 9) - (order[b] ?? 9));
  }, [products]);

  return (
    <div data-testid="book-page" className="max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
      <div className="flex items-baseline justify-between flex-wrap gap-4 mb-2">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">{t.book.title}</h1>
        {productId && product && (
          <Link to="/book" data-testid="clear-product" className="text-xs uppercase tracking-[0.2em] text-[#5C6680] hover:text-[#E8704C]">
            {lang === "en" ? "Change class type" : "Cambiar tipo de clase"}
          </Link>
        )}
      </div>
      <p className="text-lg text-[#5C6680] mb-12">
        {lang === "en" ? "Four quick steps. Pick a date first." : "Cuatro pasos rápidos. Elige fecha primero."}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT — steps */}
        <div className="lg:col-span-7 space-y-5">
          {/* STEP 1 — DATE */}
          <Step number={1} label={t.book.pickDate} done={stepDateDone} active={!stepDateDone}>
            <MonthCalendar
              value={date}
              onSelect={setDate}
              counts={slotCounts}
            />
          </Step>

          {/* STEP 2 — TIME */}
          {stepDateDone && (
            <Step number={2} label={t.book.pickTime} done={stepTimeDone} active={stepTimeActive}>
              {daySlots.length === 0 ? (
                <p className="text-sm text-[#5C6680]">{t.book.noSlots}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {daySlots.map((s) => (
                    <button
                      key={s.id}
                      data-testid={`slot-${s.start_time}`}
                      onClick={() => setTime(s.start_time)}
                      className={`py-3 text-sm border rounded-xl transition-colors ${
                        time === s.start_time
                          ? "bg-[#E8704C] text-white border-[#E8704C]"
                          : "bg-white text-[#1F3B6E] border-[#EFE4D0] hover:border-[#E8704C]"
                      }`}
                    >
                      {s.start_time}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.25em] text-[#5C6680] mb-2 flex items-center gap-2 font-semibold"><Globe size={12} />{t.book.timezone}</p>
                <Select value={tz} onValueChange={setTz}>
                  <SelectTrigger data-testid="tz-select" className="w-full max-w-sm border-[#EFE4D0]"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Step>
          )}

          {/* STEP 3 — TEACHER */}
          {stepTimeDone && teachers.length > 0 && (
            <Step number={3} label={t.book.pickTeacher} done={stepTeacherDone} active={stepTeacherActive}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teachers.map((tch) => (
                  <button
                    key={tch.id}
                    data-testid={`teacher-${tch.id}`}
                    onClick={() => setTeacherId(tch.id)}
                    className={`flex items-center gap-3 p-3 border rounded-2xl text-left transition-colors ${
                      teacherId === tch.id ? "border-[#E8704C] bg-[#FFF0E6]" : "border-[#EFE4D0] hover:border-[#E8704C]"
                    }`}
                  >
                    {tch.picture ? <img src={tch.picture} alt={tch.name} className="w-12 h-12 rounded-full object-cover" /> :
                      <div className="w-12 h-12 rounded-full bg-[#FFF0E6] flex items-center justify-center font-display text-[#E8704C]">{tch.name?.[0]}</div>}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tch.name}</p>
                      <p className="text-xs text-[#5C6680] truncate">{lang === "en" ? tch.bio_en : tch.bio_es}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {/* STEP 4 — CLASS TYPE */}
          {stepTimeDone && stepTeacherDone && !productId && (
            <Step number={teachers.length > 0 ? 4 : 3} label={lang === "en" ? "Pick a class type" : "Elige el tipo de clase"} done={stepProductDone} active={stepProductActive}>
              <div className="space-y-6">
                {productGroups.map(([type, list]) => (
                  <div key={type}>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[#5C6680] font-semibold mb-3">
                      {type === "trial" ? (lang === "en" ? "Start here" : "Empieza aquí") :
                       type === "single" ? (lang === "en" ? "Single classes" : "Clases sueltas") :
                       type === "package" ? (lang === "en" ? "Packs" : "Paquetes") :
                       type === "subscription" ? (lang === "en" ? "Monthly" : "Mensual") : type}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {list.map((p) => (
                        <button
                          key={p.id}
                          data-testid={`pick-product-${p.id}`}
                          onClick={() => setChosenProductId(p.id)}
                          className={`flex items-start justify-between gap-3 p-4 border rounded-2xl text-left transition-colors ${
                            chosenProductId === p.id ? "border-[#E8704C] bg-[#FFF0E6]" : "border-[#EFE4D0] hover:border-[#E8704C]"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{lang === "en" ? p.name_en : p.name_es}</p>
                            <p className="text-xs text-[#5C6680] mt-1">{p.duration_min}min · {p.sessions_included} {p.sessions_included > 1 ? "lessons" : "lesson"}</p>
                          </div>
                          <p className="font-display text-xl whitespace-nowrap">${p.price_usd.toFixed(0)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Step>
          )}
        </div>

        {/* RIGHT — sticky summary */}
        <aside className="lg:col-span-5">
          <div className="bg-[#FFF0E6] rounded-2xl p-8 sticky top-24">
            <p className="text-xs uppercase tracking-[0.3em] text-[#5C6680] mb-4 font-semibold">{t.book.summary}</p>
            <div className="space-y-3 text-sm">
              <Row label={t.book.pickDate} value={date ? fmt(date) : "—"} />
              <Row label={t.book.pickTime} value={time || "—"} />
              {teachers.length > 0 && <Row label={t.book.pickTeacher} value={selectedTeacher?.name || "—"} />}
              <Row label={lang === "en" ? "Class" : "Clase"} value={product ? (lang === "en" ? product.name_en : product.name_es) : "—"} />
              <Row label="TZ" value={<span className="text-xs">{tz}</span>} />
              <div className="border-t border-[#EFE4D0] my-4" />
              <div className="flex justify-between text-lg items-baseline">
                <span>Total</span>
                <span className="font-display text-2xl">{product ? `$${product.price_usd.toFixed(2)}` : "—"}</span>
              </div>
            </div>
            {!user && <p className="mt-6 text-sm text-[#E8704C]">{t.book.need_login}</p>}
            <Button
              onClick={handlePay}
              disabled={loading || !allDone}
              data-testid="pay-btn"
              className="mt-6 w-full rounded-full bg-[#E8704C] text-white hover:bg-[#C95630] hover:text-white py-6 disabled:opacity-60"
            >
              <Sparkles size={14} className="mr-2" />
              {loading ? "..." : user ? t.book.pay : t.signInWithGoogle}
            </Button>
            {!allDone && (
              <p className="mt-3 text-xs text-[#5C6680] text-center">
                {lang === "en" ? "Complete each step to enable checkout." : "Completa cada paso para habilitar el pago."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between items-baseline gap-3">
    <span className="text-[#5C6680]">{label}</span>
    <span className="font-medium text-right min-w-0 truncate">{value}</span>
  </div>
);
