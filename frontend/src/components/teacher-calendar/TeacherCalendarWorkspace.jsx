import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import WorkspaceSidePanel from "../WorkspaceSidePanel";
import { useApp } from "../../context/AppContext";
import { useMobilePageActions } from "../../context/MobileShellContext";
import {
  blockTeacherTime,
  calendarStatuses,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getTeacherCalendarWorkspace,
  listGoogleCalendars,
  saveTeacherAvailability,
  saveGoogleCalendarSettings,
  sendStudentInvitations,
  syncGoogleCalendar,
  updateClassSession,
} from "../../services/teacherCalendarService";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const weekPlaceholderHours = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:00", "19:00"];
const workWeekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const weekendDays = ["Sat", "Sun"];
const monthWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const calendarCopy = {
  en: {
    statuses: { booked: "Booked", available: "Available", blocked: "Blocked", cancelled: "Cancelled", completed: "Completed", conflict: "Conflict", empty: "Empty gap" },
    teacherWorkspace: "Teacher workspace",
    title: "Teacher Calendar",
    subtitle: "Manage classes, availability, student invitations, calendar blocks, and scheduling health.",
    openAvailability: "Open availability",
    blockTime: "Block time",
    today: "Today",
    dayTimeline: "Day timeline",
    workWeek: "Work week view",
    workWeekHelp: "Monday to Friday stay readable; weekend activity is summarized below.",
    weekend: "Weekend",
    calendarItem: "calendar item",
    calendarItems: "calendar items",
    emptySlot: "empty slot",
    emptySlots: "empty slots",
    monthView: "Month view",
    empty: "Empty",
    emptySlotTitle: "Empty slot",
    emptyDay: "Empty day",
    noClass: "No class booked yet",
    calendarCenter: "Calendar center",
    centerTitle: "Calendar stays in focus",
    centerHelp: "Open side panels only when needed, or jump directly to the next class.",
    calendarConnected: "Calendar connected",
    connectCalendar: "Connect calendar",
    nextClass: "Next class",
    todayFocus: "Today's focus",
    insights: "Insights",
    googleCalendar: "Google Calendar",
    calendarConnection: "Calendar connection",
    schedulingInsights: "Scheduling Insights",
    operationalIntel: "Operational intelligence",
    disconnect: "Disconnect",
    connectGoogle: "Connect Google Calendar",
    syncNow: "Sync now",
    conflictReview: "Google Calendar conflict needs review.",
    emptySlotsTitle: "Empty slots and fill rate",
    unavailable: "This integration is not enabled for your account yet.",
    privacy: "MOSAICO reads occupied times only. Personal event titles, descriptions, guests, and locations are not imported.",
    account: "Connected account",
    busyCalendars: "Calendars used to block availability",
    destinationCalendar: "Calendar for MOSAICO classes",
    saveCalendars: "Save calendar selection",
    reconnectRequired: "Reconnect Google Calendar to continue syncing.",
    disconnectWarning: "Future MOSAICO classes will remain booked. Existing Google events will stay in Google Calendar and will no longer be updated.",
    never: "Never",
  },
  es: {
    statuses: { booked: "Reservado", available: "Disponible", blocked: "Bloqueado", cancelled: "Cancelado", completed: "Completado", conflict: "Conflicto", empty: "Espacio vacío" },
    teacherWorkspace: "Espacio del profesor",
    title: "Calendario del profesor",
    subtitle: "Administra clases, disponibilidad, invitaciones, bloqueos de calendario y salud de agenda.",
    openAvailability: "Abrir disponibilidad",
    blockTime: "Bloquear horario",
    today: "Hoy",
    dayTimeline: "Vista del día",
    workWeek: "Semana laboral",
    workWeekHelp: "Lunes a viernes se mantiene legible; el fin de semana se resume abajo.",
    weekend: "Fin de semana",
    calendarItem: "elemento de calendario",
    calendarItems: "elementos de calendario",
    emptySlot: "espacio vacío",
    emptySlots: "espacios vacíos",
    monthView: "Vista mensual",
    empty: "Vacío",
    emptySlotTitle: "Espacio vacío",
    emptyDay: "Día vacío",
    noClass: "Aún no hay clase reservada",
    calendarCenter: "Centro del calendario",
    centerTitle: "El calendario permanece en foco",
    centerHelp: "Abre paneles laterales sólo cuando los necesites o salta directo a la próxima clase.",
    calendarConnected: "Calendario conectado",
    connectCalendar: "Conectar calendario",
    nextClass: "Próxima clase",
    todayFocus: "Foco de hoy",
    insights: "Insights",
    googleCalendar: "Google Calendar",
    calendarConnection: "Conexión de calendario",
    schedulingInsights: "Insights de agenda",
    operationalIntel: "Inteligencia operativa",
    disconnect: "Desconectar",
    connectGoogle: "Conectar Google Calendar",
    syncNow: "Sincronizar",
    conflictReview: "conflicto de Google Calendar requiere revisión.",
    emptySlotsTitle: "Espacios vacíos y tasa de ocupación",
    unavailable: "Esta integración todavía no está habilitada para tu cuenta.",
    privacy: "MOSAICO sólo consulta periodos ocupados. No importa títulos, descripciones, invitados ni ubicaciones de eventos personales.",
    account: "Cuenta conectada",
    busyCalendars: "Calendarios que bloquean disponibilidad",
    destinationCalendar: "Calendario para clases de MOSAICO",
    saveCalendars: "Guardar selección de calendarios",
    reconnectRequired: "Vuelve a conectar Google Calendar para continuar sincronizando.",
    disconnectWarning: "Las clases futuras seguirán reservadas. Los eventos existentes permanecerán en Google Calendar y ya no se actualizarán.",
    never: "Nunca",
  },
};

function useCalendarCopy() {
  const { lang } = useApp();
  return calendarCopy[lang] || calendarCopy.en;
}
const dayDates = {
  Mon: "2026-07-06",
  Tue: "2026-07-07",
  Wed: "2026-07-08",
  Thu: "2026-07-09",
  Fri: "2026-07-10",
  Sat: "2026-07-11",
  Sun: "2026-07-12",
};

const statusStyles = {
  booked: "border-[#2DA89F] bg-[#E0F2F0] text-[#1B6F68]",
  available: "border-[#4A90D9] bg-[#EAF4FF] text-[#1F5F9D]",
  blocked: "border-[#5C6680] bg-[#EEF0F4] text-[#4B5563]",
  cancelled: "border-[#E8704C] bg-[#FFF0E6] text-[#C95630]",
  completed: "border-[#4FA85F] bg-[#EAF7EA] text-[#2F7A3C]",
  conflict: "border-[#F4C13D] bg-[#FFF9E8] text-[#9A6A00]",
  empty: "border-dashed border-[#EFE4D0] bg-white text-[#5C6680]",
};

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] bg-[#10213F]/45 p-4 backdrop-blur-sm">
      <div className="ml-auto flex h-full max-w-xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EFE4D0] px-5 py-4">
          <h2 className="font-display text-2xl text-[#1F3B6E]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-[#5C6680] hover:bg-[#FFF0E6]"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#1F3B6E]">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-[#E8704C]">{error}</p>}
    </label>
  );
}

function Input(props) {
  return <input {...props} className={`h-10 w-full rounded-md border border-[#EFE4D0] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C] ${props.className || ""}`} />;
}

function Select(props) {
  return <select {...props} className={`h-10 w-full rounded-md border border-[#EFE4D0] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C] ${props.className || ""}`} />;
}

function StatusBadge({ status }) {
  const copy = useCalendarCopy();
  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.empty}`}>{copy.statuses[status] || calendarStatuses[status] || status}</span>;
}

function CalendarLegend() {
  const copy = useCalendarCopy();
  return (
    <div className="flex max-w-full flex-wrap gap-1 overflow-hidden rounded-lg border border-[#EFE4D0] bg-[#FBF7EE] p-2 sm:gap-2 sm:p-3">
      {["booked", "available", "empty", "blocked", "conflict", "completed", "cancelled"].map((status) => (
        <span key={status} className={`whitespace-nowrap rounded-md border px-1.5 py-1 text-[11px] font-semibold sm:px-2 sm:text-xs ${statusStyles[status]}`}>
          <span className="sm:hidden">{status === "empty" ? copy.empty : copy.statuses[status]}</span>
          <span className="hidden sm:inline">{copy.statuses[status]}</span>
        </span>
      ))}
    </div>
  );
}

function addOneHour(time) {
  const [hour, minute] = time.split(":").map(Number);
  return `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function AvailabilityOptions({ session, compact = false, maxOptions = 2 }) {
  if (session.status !== "available" || !session.slotOptions?.length) return null;
  const visibleOptions = compact ? session.slotOptions.slice(0, maxOptions) : session.slotOptions;
  return (
    <div className={`mt-2 grid gap-1 ${compact ? "" : "rounded-md bg-white/70 p-2"}`}>
      {visibleOptions.map((option) => (
        <div key={option.duration} className="flex items-center justify-between gap-2 rounded bg-white/80 px-2 py-1 text-[11px]">
          <span className="font-semibold">{option.duration} min</span>
          <span>{option.count} slot{option.count === 1 ? "" : "s"}</span>
        </div>
      ))}
      {!compact && (
        <div className="mt-1 flex flex-wrap gap-1">
          {session.slotOptions.flatMap((option) => option.slots.slice(0, 2).map((slot) => (
            <span key={`${option.duration}-${slot.start}`} className="rounded bg-[#EAF4FF] px-2 py-1 text-[11px] text-[#1F5F9D]">{slot.start}-{slot.end}</span>
          )))}
        </div>
      )}
      {compact && session.slotOptions.length > maxOptions && <p className="truncate text-[11px] font-semibold">+{session.slotOptions.length - maxOptions} options</p>}
      <p className="truncate text-[11px]">Cooldown: {session.cooldownMinutes || 0} min</p>
    </div>
  );
}

function EmptySlotPlaceholder({ date, start, end, compact = false, label, detail, onInvite, tiny = false }) {
  const copy = useCalendarCopy();
  const fallbackLabel = date ? `${date} - ${start}-${end}` : `${start}-${end}`;
  const displayLabel = label || fallbackLabel;
  return (
    <button
      type="button"
      onClick={() => onInvite?.({ id: `placeholder-${date || "day"}-${start}`, date, start, end, demand: "Open", suggestion: "Turn this empty slot into bookable availability or invite students." })}
      className={`min-w-0 w-full rounded-lg border border-dashed border-[#D9C8A8] bg-white text-left text-[#5C6680] transition hover:border-[#E8704C] hover:bg-[#FFF0E6] ${tiny ? "px-2 py-1" : compact ? "p-2" : "p-3"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`${tiny ? "truncate text-[11px]" : compact ? "truncate text-xs" : "font-semibold text-[#1F3B6E]"}`}>{tiny ? copy.empty : compact ? copy.empty : copy.emptySlotTitle}</p>
          {!tiny && <p className={`${compact ? "truncate text-xs" : "mt-1 text-sm"}`}>{displayLabel}</p>}
          {!compact && !tiny && <p className="mt-1 text-xs">{detail || copy.noClass}</p>}
        </div>
        {!compact && !tiny && <StatusBadge status="empty" />}
      </div>
    </button>
  );
}

function PendingWorkflowButton({ children, className = "", icon: Icon }) {
  const reason = "This workflow needs a backend model before it can be used in production.";
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      title={reason}
      aria-label={`${children}. ${reason}`}
      className={className}
    >
      {Icon ? <Icon size={16} className="mr-2" /> : null}
      {children}
    </Button>
  );
}

function CalendarToolbar({ view, setView, label, setLabel, openAvailability, openBlock }) {
  const copy = useCalendarCopy();
  const views = ["day", "week", "month"];
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">{copy.teacherWorkspace}</p>
          <h1 className="mt-1 font-display text-4xl text-[#1F3B6E]">{copy.title}</h1>
          <p className="mt-1 text-sm text-[#5C6680]">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAvailability} className="bg-[#E8704C] text-white hover:bg-[#C95630]"><Plus size={16} className="mr-2" />{copy.openAvailability}</Button>
          <Button onClick={openBlock} variant="outline" className="border-[#EFE4D0]"><Ban size={16} className="mr-2" />{copy.blockTime}</Button>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-fit rounded-md border border-[#EFE4D0] p-1">
          {views.map((item) => (
            <button key={item} onClick={() => setView(item)} className={`rounded px-4 py-2 text-sm font-semibold capitalize ${view === item ? "bg-[#FFF0E6] text-[#E8704C]" : "text-[#5C6680]"}`}>{item}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setLabel("Previous period")}><ChevronLeft size={16} /></Button>
          <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setLabel("Jul 6-12, 2026")}>{copy.today}</Button>
          <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setLabel("Next period")}><ChevronRight size={16} /></Button>
          <span className="rounded-md bg-[#FBF7EE] px-3 py-2 text-sm font-semibold text-[#1F3B6E]">{label}</span>
        </div>
      </div>
    </div>
  );
}

function CalendarSlotCard({ session, onOpen, compact = false, highlighted = false, density = "default" }) {
  const copy = useCalendarCopy();
  const isMonth = density === "month";
  const isWeek = density === "week";
  const compactCard = compact || isMonth || isWeek;
  const timeLabel = `${session.start} - ${session.end}`;
  return (
    <button
      id={`calendar-session-${session.id}`}
      onClick={() => onOpen(session)}
      className={`min-w-0 w-full rounded-lg border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isMonth ? "px-2 py-1.5" : compactCard ? "p-2" : "p-3"} ${highlighted ? "ring-4 ring-[#F4C13D] ring-offset-2" : ""} ${statusStyles[session.status] || statusStyles.empty}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`${isMonth ? "truncate text-[11px] font-semibold" : compactCard ? "truncate text-sm font-semibold" : "font-semibold"}`}>{timeLabel}</p>
          {compactCard ? <p className={`${isMonth ? "text-[11px]" : "mt-1 text-xs"} truncate`}>{session.studentName || session.classType || copy.statuses[session.status]}</p> : <p className="mt-1 truncate text-sm">{session.studentName || session.classType}</p>}
        </div>
        {compactCard ? <StatusBadge status={session.status} /> : <MoreHorizontal size={16} className="shrink-0" />}
      </div>
      {!isMonth && <AvailabilityOptions session={session} compact={compactCard} maxOptions={isWeek ? 2 : 3} />}
      {!compactCard && (
        <div className="mt-2 grid gap-1 text-xs">
          <div><StatusBadge status={session.status} /></div>
          <p>{session.studentName ? `${session.classType} - ${session.level}` : session.reason || session.location || "Open slot"}</p>
          <p>{session.credits || 0} credits</p>
          {session.conflict && <p className="flex items-center gap-1"><AlertTriangle size={12} />{session.conflict}</p>}
        </div>
      )}
    </button>
  );
}

function DayView({ sessions, emptySlots, onOpen, onInvite, highlightedSessionId }) {
  const copy = useCalendarCopy();
  const visibleEmptySlots = emptySlots.filter((slot) => slot.date === "2026-07-06");
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-display text-2xl text-[#1F3B6E]">{copy.dayTimeline}</h2>
        <CalendarLegend />
      </div>
      <div className="mt-4 grid gap-2">
        {hours.map((hour) => {
          const item = sessions.find((session) => session.start === hour);
          const emptySlot = visibleEmptySlots.find((slot) => slot.start === hour);
          return (
            <div key={hour} className="grid grid-cols-[72px_1fr] gap-3">
              <p className="py-3 text-sm text-[#5C6680]">{hour}</p>
              {item ? <CalendarSlotCard session={item} onOpen={onOpen} highlighted={item.id === highlightedSessionId} /> : <EmptySlotPlaceholder date={emptySlot?.date || "2026-07-06"} start={hour} end={emptySlot?.end || addOneHour(hour)} onInvite={onInvite} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayColumn({ day, sessions, emptySlots, onOpen, onInvite, highlightedSessionId }) {
  const daySessions = sessions.filter((session) => session.day === day);
  const dayEmptySlots = emptySlots.filter((slot) => slot.date === dayDates[day]);
  const dayHours = Array.from(new Set([...weekPlaceholderHours, ...daySessions.map((session) => session.start), ...dayEmptySlots.map((slot) => slot.start)])).sort();
  return (
    <div className="min-w-0 rounded-lg bg-[#FBF7EE] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-[#1F3B6E]">{day}</p>
        <p className="truncate text-xs text-[#5C6680]">{dayDates[day]?.slice(5).replace("-", "/")}</p>
      </div>
      <div className="mt-3 grid min-w-0 gap-2">
        {dayHours.map((hour) => {
          const session = daySessions.find((item) => item.start === hour);
          const emptySlot = dayEmptySlots.find((slot) => slot.start === hour);
          return session ? (
            <CalendarSlotCard key={session.id} session={session} onOpen={onOpen} density="week" highlighted={session.id === highlightedSessionId} />
          ) : (
            <EmptySlotPlaceholder key={`${day}-${hour}`} date={dayDates[day]} start={hour} end={emptySlot?.end || addOneHour(hour)} compact onInvite={onInvite} />
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ sessions, emptySlots, onOpen, onInvite, highlightedSessionId }) {
  const copy = useCalendarCopy();
  const weekendItems = sessions.filter((session) => weekendDays.includes(session.day));
  const weekendEmpty = emptySlots.filter((slot) => weekendDays.some((day) => dayDates[day] === slot.date));
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl text-[#1F3B6E]">{copy.workWeek}</h2>
          <p className="text-sm text-[#5C6680]">{copy.workWeekHelp}</p>
        </div>
        <CalendarLegend />
      </div>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {workWeekDays.map((day) => <DayColumn key={day} day={day} sessions={sessions} emptySlots={emptySlots} onOpen={onOpen} onInvite={onInvite} highlightedSessionId={highlightedSessionId} />)}
      </div>
      <div className="mt-3 rounded-lg border border-[#EFE4D0] bg-[#FBF7EE] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-[#1F3B6E]">{copy.weekend}</p>
          <p className="text-sm text-[#5C6680]">{weekendItems.length} {weekendItems.length === 1 ? copy.calendarItem : copy.calendarItems} - {weekendEmpty.length} {weekendEmpty.length === 1 ? copy.emptySlot : copy.emptySlots}</p>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {weekendItems.slice(0, 2).map((session) => <CalendarSlotCard key={session.id} session={session} onOpen={onOpen} density="week" highlighted={session.id === highlightedSessionId} />)}
          {weekendEmpty.slice(0, 2).map((slot) => <EmptySlotPlaceholder key={slot.id} date={slot.date} start={slot.start} end={slot.end} compact onInvite={onInvite} />)}
        </div>
      </div>
    </div>
  );
}

function MonthView({ sessions, emptySlots, onOpen, onInvite, highlightedSessionId }) {
  const copy = useCalendarCopy();
  const year = 2026;
  const month = 6;
  const dates = Array.from({ length: 31 }, (_, idx) => idx + 1);
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const leadingBlanks = Array.from({ length: mondayOffset }, (_, idx) => `blank-start-${idx}`);
  const trailingBlanks = Array.from({ length: (7 - ((leadingBlanks.length + dates.length) % 7)) % 7 }, (_, idx) => `blank-end-${idx}`);
  return (
    <div className="min-w-0 rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-display text-2xl text-[#1F3B6E]">{copy.monthView}</h2>
        <CalendarLegend />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#5C6680] sm:gap-2">
        {monthWeekdays.map((day) => <div key={day} className="rounded-md bg-[#FBF7EE] px-1 py-2">{day}</div>)}
      </div>
      <div className="mt-2 grid min-w-0 grid-cols-7 gap-1 sm:gap-2">
        {leadingBlanks.map((item) => <div key={item} className="min-h-24 rounded-lg border border-transparent bg-transparent sm:min-h-32" />)}
        {dates.map((date) => {
          const key = `2026-07-${String(date).padStart(2, "0")}`;
          const daySessions = sessions.filter((session) => session.date === key);
          const dayEmptySlots = emptySlots.filter((slot) => slot.date === key);
          const rawWeekday = new Date(year, month, date).getDay();
          const weekday = monthWeekdays[rawWeekday === 0 ? 6 : rawWeekday - 1];
          const totalItems = daySessions.length + dayEmptySlots.length;
          return (
            <div key={date} className="min-h-24 min-w-0 overflow-hidden rounded-lg border border-[#EFE4D0] bg-[#FBF7EE] p-1.5 sm:min-h-32 sm:p-2">
              <div className="flex min-w-0 items-center justify-between gap-1">
                <p className="truncate font-semibold text-[#1F3B6E]">{date}</p>
                <p className="hidden truncate text-[11px] text-[#5C6680] sm:block">{weekday}</p>
              </div>
              <div className="mt-1 grid min-w-0 gap-1">
                {daySessions.slice(0, 2).map((session) => <CalendarSlotCard key={session.id} session={session} onOpen={onOpen} density="month" highlighted={session.id === highlightedSessionId} />)}
                {daySessions.length < 2 && dayEmptySlots.slice(0, 2 - daySessions.length).map((slot) => <EmptySlotPlaceholder key={slot.id} date={slot.date} start={slot.start} end={slot.end} tiny onInvite={onInvite} />)}
                {totalItems > 2 && <p className="truncate rounded bg-white/70 px-2 py-1 text-[11px] font-semibold text-[#5C6680]">+{totalItems - 2} more</p>}
                {totalItems === 0 && <EmptySlotPlaceholder date={key} start="empty" end="day" label={copy.emptyDay} tiny onInvite={onInvite} />}
              </div>
            </div>
          );
        })}
        {trailingBlanks.map((item) => <div key={item} className="min-h-24 rounded-lg border border-transparent bg-transparent sm:min-h-32" />)}
      </div>
    </div>
  );
}

function GoogleCalendarCard({ integration, setIntegration }) {
  const copy = useCalendarCopy();
  const [loading, setLoading] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [busyCalendarIds, setBusyCalendarIds] = useState([]);
  const [destinationCalendarId, setDestinationCalendarId] = useState("");
  const [error, setError] = useState("");
  const selectedBusyCalendars = useMemo(
    () => integration.selectedBusyCalendars || [],
    [integration.selectedBusyCalendars],
  );

  useEffect(() => {
    setBusyCalendarIds(selectedBusyCalendars.map((item) => item.id));
    setDestinationCalendarId(integration.destinationCalendar?.id || "");
    if (!integration.connected) {
      setCalendars([]);
      return;
    }
    let active = true;
    listGoogleCalendars()
      .then((items) => {
        if (active) setCalendars(items);
      })
      .catch((requestError) => {
        if (active) setError(requestError.appError?.message || "Could not load calendars.");
      });
    return () => { active = false; };
  }, [integration.connected, integration.destinationCalendar?.id, selectedBusyCalendars]);

  const run = async (action, successMessage) => {
    setLoading(true);
    setError("");
    try {
      const next = await action();
      if (next) setIntegration(next);
      toast.success(successMessage);
    } catch (requestError) {
      const message = requestError.appError?.message || "Calendar request failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBusyCalendar = (calendarId) => {
    setBusyCalendarIds((current) => (
      current.includes(calendarId)
        ? current.filter((item) => item !== calendarId)
        : [...current, calendarId]
    ));
  };

  const saveSelection = () => run(
    () => saveGoogleCalendarSettings(busyCalendarIds, destinationCalendarId),
    "Calendar selection saved.",
  );

  const disconnect = () => {
    const futureCount = integration.futureSyncedClassCount || 0;
    const classNotice = futureCount
      ? `\n\n${futureCount} future synchronized class${futureCount === 1 ? "" : "es"}.`
      : "";
    if (!window.confirm(`${copy.disconnectWarning}${classNotice}\n\n${copy.disconnect}?`)) return;
    run(disconnectGoogleCalendar, "Google Calendar disconnected.");
  };

  if (!integration.featureEnabled && !integration.connected) {
    return (
      <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5C6680]">{copy.googleCalendar}</p>
        <h2 className="mt-1 font-display text-xl text-[#1F3B6E]">{copy.calendarConnection}</h2>
        <p className="mt-3 rounded-md bg-[#FBF7EE] p-3 text-sm text-[#5C6680]">{copy.unavailable}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5C6680]">{copy.googleCalendar}</p>
          <h2 className="mt-1 font-display text-xl text-[#1F3B6E]">{integration.connected ? copy.calendarConnected : copy.connectCalendar}</h2>
          <p className="mt-1 text-sm text-[#5C6680]">
            {integration.connected
              ? `${copy.account}: ${integration.account}`
              : copy.privacy}
          </p>
        </div>
        <StatusBadge status={integration.connected ? "completed" : "blocked"} />
      </div>
      <p className="mt-4 rounded-md bg-[#EAF4FF] p-3 text-sm text-[#1F5F9D]">{copy.privacy}</p>
      {integration.status === "reconnect_required" && (
        <p className="mt-3 rounded-md bg-[#FFF9E8] p-3 text-sm text-[#9A6A00]" role="alert">{copy.reconnectRequired}</p>
      )}
      {error && <p className="mt-3 rounded-md bg-[#FFE7E2] p-3 text-sm text-[#B42318]" role="alert">{error}</p>}
      <div className="mt-4 grid gap-3">
        {!integration.connected ? (
          <Button
            disabled={loading || !integration.configured}
            onClick={() => run(connectGoogleCalendar, "Opening Google consent...")}
            className="bg-[#1F3B6E] text-white hover:bg-[#162B52]"
          >
            <LinkIcon size={16} className="mr-2" />{copy.connectGoogle}
          </Button>
        ) : (
          <>
            <fieldset className="rounded-md border border-[#EFE4D0] p-3">
              <legend className="px-1 text-sm font-semibold text-[#1F3B6E]">{copy.busyCalendars}</legend>
              <div className="mt-2 grid gap-2">
                {calendars.map((calendar) => (
                  <label key={calendar.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-[#FBF7EE]">
                    <input
                      type="checkbox"
                      checked={busyCalendarIds.includes(calendar.id)}
                      onChange={() => toggleBusyCalendar(calendar.id)}
                      className="mt-1 h-4 w-4 accent-[#E8704C]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{calendar.name}</span>
                      <span className="block text-xs text-[#5C6680]">{calendar.primary ? "Primary · " : ""}{calendar.accessRole}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label={copy.destinationCalendar}>
              <Select value={destinationCalendarId} onChange={(event) => setDestinationCalendarId(event.target.value)}>
                <option value="">Select a calendar</option>
                {calendars.filter((calendar) => calendar.canUseForEvents).map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>{calendar.name}{calendar.primary ? " (Primary)" : ""}</option>
                ))}
              </Select>
            </Field>
            <Button
              disabled={loading || !busyCalendarIds.length || !destinationCalendarId}
              onClick={saveSelection}
              className="bg-[#E8704C] text-white hover:bg-[#C95630]"
            >
              <Check size={16} className="mr-2" />{copy.saveCalendars}
            </Button>
            <Button disabled={loading || !destinationCalendarId} onClick={() => run(syncGoogleCalendar, "Google Calendar synchronized.")} className="bg-[#1F3B6E] text-white hover:bg-[#162B52]">
              <RefreshCw size={16} className="mr-2" />{loading ? "..." : copy.syncNow}
            </Button>
            <p className="text-xs text-[#5C6680]">
              {copy.syncNow}: {integration.lastSuccessfulSyncAt ? new Date(integration.lastSuccessfulSyncAt).toLocaleString() : copy.never}
            </p>
            <Button disabled={loading} onClick={disconnect} variant="outline" className="border-[#EFE4D0]">
              <LinkIcon size={16} className="mr-2" />{copy.disconnect}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function SchedulingInsightsPanel({ insights }) {
  const metrics = [
    ["Hours taught this week", insights.weekHours],
    ["Hours taught this month", insights.monthHours],
    ["Occupancy", `${insights.occupancy}%`],
    ["Available hours", insights.availableHours],
    ["Empty slots", insights.emptySlots],
    ["Students waiting", insights.studentsWaiting],
  ];
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-[#1F3B6E]">Scheduling insights</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[#FBF7EE] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5C6680]">{label}</p>
            <p className="mt-1 font-display text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <Progress value={insights.occupancy} className="mt-4 h-2" />
      <div className="mt-4 grid gap-2">
        {insights.suggestions.map((suggestion) => <p key={suggestion} className="flex gap-2 text-sm text-[#5C6680]"><Sparkles size={15} className="text-[#F4C13D]" />{suggestion}</p>)}
      </div>
    </div>
  );
}

function CalendarActionCenter({ integration, sessions, onOpenCalendar, onHighlightNext, onHighlightToday, onOpenInsights }) {
  const copy = useCalendarCopy();
  const booked = sessions.filter((item) => ["booked", "conflict"].includes(item.status));
  const today = booked.filter((item) => item.date === "2026-07-06");
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">{copy.calendarCenter}</p>
          <h2 className="mt-1 font-display text-2xl text-[#1F3B6E]">{copy.centerTitle}</h2>
          <p className="mt-1 text-sm text-[#5C6680]">{copy.centerHelp}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(integration.featureEnabled || integration.connected) && <Button onClick={onOpenCalendar} variant="outline" className="border-[#EFE4D0]"><LinkIcon size={16} className="mr-2" />{integration.connected ? copy.calendarConnected : copy.connectCalendar}</Button>}
          <Button disabled={!booked.length} onClick={onHighlightNext} className="bg-[#1F3B6E] text-white hover:bg-[#162B52]"><Video size={16} className="mr-2" />{copy.nextClass}</Button>
          <Button disabled={!today.length} onClick={onHighlightToday} variant="outline" className="border-[#EFE4D0]"><CalendarDays size={16} className="mr-2" />{copy.todayFocus}</Button>
          <Button onClick={onOpenInsights} variant="outline" className="border-[#EFE4D0]"><Sparkles size={16} className="mr-2" />{copy.insights}</Button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ template: "Regular schedule", days: ["Mon"], startTime: "09:00", endTime: "12:00", durationOptions: [30, 45, 60], cooldownMinutes: 0, maxClasses: 4, location: "Online", active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDuration = (duration) => {
    setForm((current) => {
      const selected = new Set(current.durationOptions);
      if (selected.has(duration)) selected.delete(duration);
      else selected.add(duration);
      return { ...current, durationOptions: Array.from(selected).sort((a, b) => a - b) };
    });
  };
  const save = async () => {
    setError("");
    if (form.endTime <= form.startTime) {
      setError("End time must be after start time.");
      return;
    }
    if (!form.durationOptions.length) {
      setError("Select at least one class duration.");
      return;
    }
    setLoading(true);
    try {
      const slot = await saveTeacherAvailability(form);
      toast.success("Availability opened.");
      onSaved(slot);
      onClose();
    } catch {
      toast.error("Could not save availability.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal title="Open availability" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Template"><Select value={form.template} onChange={(event) => update("template", event.target.value)}><option>Regular schedule</option><option>Summer schedule</option><option>Holiday schedule</option><option>Custom template</option></Select></Field>
        <Field label="Day"><Select value={form.days[0]} onChange={(event) => update("days", [event.target.value])}>{days.map((day) => <option key={day}>{day}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Start time"><Input type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field><Field label="End time" error={error}><Input type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} /></Field></div>
        <Field label="Class durations" error={error && !form.durationOptions.length ? error : ""}>
          <div className="grid grid-cols-3 gap-2">
            {[30, 45, 60].map((duration) => (
              <button key={duration} type="button" onClick={() => toggleDuration(duration)} className={`rounded-md border px-3 py-2 text-sm font-semibold ${form.durationOptions.includes(duration) ? "border-[#2DA89F] bg-[#E0F2F0] text-[#1B6F68]" : "border-[#EFE4D0] bg-white text-[#5C6680]"}`}>{duration} min</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Cooldown gap"><Input type="number" min="0" step="5" value={form.cooldownMinutes} onChange={(event) => update("cooldownMinutes", Number(event.target.value))} /></Field><Field label="Max/day"><Input type="number" value={form.maxClasses} onChange={(event) => update("maxClasses", Number(event.target.value))} /></Field></div>
        <Field label="Location"><Select value={form.location} onChange={(event) => update("location", event.target.value)}><option>Online</option><option>Campus</option><option>Hybrid</option></Select></Field>
        <div className="grid gap-2 rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">
          <button disabled title="Schedule copy requires recurring availability templates." className="text-left disabled:opacity-60">Copy Monday schedule to selected days</button>
          <button disabled title="Week duplication requires recurring availability templates." className="text-left disabled:opacity-60">Duplicate previous week</button>
          <button disabled title="Bulk edit requires persisted availability slot selection." className="text-left disabled:opacity-60">Bulk edit selected slots</button>
        </div>
        <Button disabled={loading} onClick={save} className="bg-[#E8704C] text-white hover:bg-[#C95630]">{loading ? "Saving..." : "Save availability"}</Button>
      </div>
    </Modal>
  );
}

function BlockTimeModal({ sessions, onClose, onSaved }) {
  const [form, setForm] = useState({ reason: "Vacation", startDate: "2026-07-08", startTime: "09:00", endTime: "12:00", recurrence: "None", notes: "", visibility: "generic" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const conflicts = sessions.filter((session) => session.date === form.startDate && ["booked", "conflict"].includes(session.status));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setError("");
    if (form.endTime <= form.startTime) {
      setError("Cannot end before start.");
      return;
    }
    setLoading(true);
    try {
      const result = await blockTeacherTime(form);
      toast.success("Time blocked.");
      onSaved(result.block);
      onClose();
    } catch {
      toast.error("Could not block time.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal title="Block time" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Reason"><Select value={form.reason} onChange={(event) => update("reason", event.target.value)}>{["Vacation", "Medical appointment", "Holiday", "Personal event", "Conference", "Training", "Emergency", "Sick leave", "Administrative work", "Custom reason"].map((reason) => <option key={reason}>{reason}</option>)}</Select></Field>
        <Field label="Start date"><Input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Start time"><Input type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field><Field label="End time" error={error}><Input type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} /></Field></div>
        <Field label="Recurrence"><Select value={form.recurrence} onChange={(event) => update("recurrence", event.target.value)}><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></Select></Field>
        <Field label="Visibility to students"><Select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}><option value="generic">Generic unavailable</option><option value="reason">Show reason</option></Select></Field>
        <Field label="Notes"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} className="w-full rounded-md border border-[#EFE4D0] p-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" /></Field>
        {conflicts.length > 0 && <div className="rounded-lg bg-[#FFF9E8] p-4 text-sm text-[#9A6A00]"><p className="font-semibold">{conflicts.length} booked/conflict class overlaps this block.</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline">Keep classes</Button><Button variant="outline">Request reschedule</Button><Button variant="outline">Cancel affected classes</Button></div></div>}
        <Button disabled={loading} onClick={save} className="bg-[#E8704C] text-white hover:bg-[#C95630]">{loading ? "Blocking..." : "Block time"}</Button>
      </div>
    </Modal>
  );
}

function StudentInviteDrawer({ slot, students, onClose }) {
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const matches = students.filter((student) => filter === "all" || (filter === "credits" && student.credits > 0) || (filter === "behind" && student.behindRoadmap) || student.level === filter);
  const message = `Hi {{studentName}}, I have availability on ${slot?.date || "this week"} at ${slot?.start || "a new time"}. You can use your available credits to book this class.`;
  const send = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one student.");
      return;
    }
    setLoading(true);
    try {
      const result = await sendStudentInvitations(slot, selected, message);
      toast.success(`${result.invited} invitation${result.invited === 1 ? "" : "s"} sent.`);
      onClose();
    } catch {
      toast.error("Could not send invitations.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal title="Invite students" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Filter students"><Select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All students</option><option value="credits">Has credits</option><option value="behind">Behind roadmap</option><option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option></Select></Field>
        <div className="grid gap-2">
          {matches.map((student) => (
            <label key={student.id} className="flex items-start gap-3 rounded-lg border border-[#EFE4D0] p-3">
              <input type="checkbox" checked={selected.includes(student.id)} onChange={() => setSelected((items) => items.includes(student.id) ? items.filter((id) => id !== student.id) : [...items, student.id])} className="mt-1 accent-[#E8704C]" />
              <span><span className="block font-semibold">{student.name}</span><span className="text-sm text-[#5C6680]">{student.level} - {student.credits} credits - {student.preferredTime}</span></span>
            </label>
          ))}
        </div>
        <div className="rounded-lg bg-[#FBF7EE] p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5C6680]">Preview</p><p className="mt-2 text-sm text-[#5C6680]">{message}</p></div>
        <Button disabled={loading} onClick={send} className="bg-[#2DA89F] text-white hover:bg-[#23877f]"><Send size={16} className="mr-2" />{loading ? "Sending..." : "Send invitation"}</Button>
      </div>
    </Modal>
  );
}

function StudentQuickViewDrawer({ session, student, onClose, onSessionUpdated }) {
  const [loadingAction, setLoadingAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const runAction = async (action, payload = {}) => {
    if (action === "complete" && !feedback.trim()) {
      toast.error("Feedback is required to mark completed.");
      return;
    }
    setLoadingAction(action);
    try {
      const next = await updateClassSession(session.id, action, { ...payload, feedback });
      onSessionUpdated(next);
      toast.success("Class updated.");
      if (["cancel", "complete"].includes(action)) onClose();
    } catch {
      toast.error("Could not update class.");
    } finally {
      setLoadingAction("");
    }
  };
  return (
    <Modal title={student ? student.name : "Calendar item"} onClose={onClose}>
      <div className="grid gap-4">
        <div className={`rounded-lg border p-4 ${statusStyles[session.status] || statusStyles.empty}`}>
          <p className="font-semibold">{session.start} - {session.end}</p>
          <p className="text-sm">{session.classType}</p>
          <div className="mt-2"><StatusBadge status={session.status} /></div>
        </div>
        {student && (
          <div className="grid gap-3 rounded-lg bg-[#FBF7EE] p-4">
            <p><strong>Level:</strong> {student.level} - {student.roadmapStage}</p>
            <p><strong>Credits:</strong> {student.credits}</p>
            <p><strong>Last class:</strong> {student.lastClassDate}</p>
            <Progress value={student.progress} className="h-2" />
            <p className="text-sm text-[#5C6680]">Badges: {student.badges.join(", ")}</p>
          </div>
        )}
        <Field label="Teacher feedback / class notes"><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} className="w-full rounded-md border border-[#EFE4D0] p-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="Add feedback, notes, homework, or late/no-show details" /></Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <PendingWorkflowButton icon={UserRound}>Open profile</PendingWorkflowButton>
          <PendingWorkflowButton icon={MessageCircle}>Message</PendingWorkflowButton>
          <Button variant="outline" onClick={() => runAction("reschedule", { date: "2026-07-12", start: "17:00", end: "18:00" })}><Clock size={16} className="mr-2" />Reschedule</Button>
          <Button variant="outline" onClick={() => runAction("cancel", { reason: "Teacher cancelled" })}><Ban size={16} className="mr-2" />Cancel</Button>
          <Button disabled={loadingAction === "complete"} onClick={() => runAction("complete")} className="bg-[#2DA89F] text-white hover:bg-[#23877f]"><Check size={16} className="mr-2" />Mark completed</Button>
          <Button variant="outline" onClick={() => runAction("noshow", { notes: feedback })}>Mark no-show</Button>
          <Button variant="outline" onClick={() => runAction("late", { notes: feedback })}>Mark late</Button>
          <PendingWorkflowButton>Add homework</PendingWorkflowButton>
        </div>
      </div>
    </Modal>
  );
}

function EmptySlotsPanel({ slots, onInvite }) {
  const copy = useCalendarCopy();
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-[#1F3B6E]">{copy.emptySlotsTitle}</h2>
      <div className="mt-4 grid gap-3">
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-lg border border-[#EFE4D0] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{slot.date} - {slot.start}-{slot.end}</p><p className="text-sm text-[#5C6680]">{slot.suggestion}</p></div>
              <span className="rounded-md bg-[#FFF9E8] px-2 py-1 text-xs text-[#9A6A00]">{slot.demand} demand</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => onInvite(slot)} variant="outline" className="border-[#EFE4D0]"><Mail size={16} className="mr-2" />Invite students</Button>
              <PendingWorkflowButton className="border-[#EFE4D0]">Share slot</PendingWorkflowButton>
              <PendingWorkflowButton className="border-[#EFE4D0]">Close slot</PendingWorkflowButton>
              <PendingWorkflowButton className="border-[#EFE4D0]">Waitlist campaign</PendingWorkflowButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherCalendarWorkspace() {
  const copy = useCalendarCopy();
  const [view, setView] = useState("week");
  const [label, setLabel] = useState("Jul 6-12, 2026");
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [emptySlots, setEmptySlots] = useState([]);
  const [integration, setIntegration] = useState({});
  const [insights, setInsights] = useState(null);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [inviteSlot, setInviteSlot] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState("");
  const [sidePanel, setSidePanel] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const calendarResult = url.searchParams.get("calendar");
    if (!calendarResult) return;
    if (calendarResult === "connected") {
      toast.success("Google Calendar connected. Select calendars to finish setup.");
      setSidePanel("calendar");
    } else {
      toast.error("Google Calendar could not be connected. Please try again.");
    }
    url.searchParams.delete("calendar");
    url.searchParams.delete("code");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    getTeacherCalendarWorkspace()
      .then((data) => {
        setSessions(data.sessions);
        setStudents(data.students);
        setEmptySlots(data.emptySlots);
        setIntegration(data.integration);
        setInsights(data.insights);
      })
      .catch(() => toast.error("Could not load teacher calendar."))
      .finally(() => setLoading(false));
  }, []);

  const selectedStudent = selectedSession?.studentId ? students.find((student) => student.id === selectedSession.studentId) : null;
  const updateSession = (nextSession) => setSessions((items) => items.map((item) => item.id === nextSession.id ? nextSession : item));
  const bookedSessions = sessions.filter((item) => ["booked", "conflict"].includes(item.status));
  const highlightSession = (session) => {
    if (!session) return;
    setHighlightedSessionId(session.id);
    setTimeout(() => {
      document.getElementById(`calendar-session-${session.id}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 50);
  };
  const mobilePage = useMemo(() => ({
    title: copy.title,
    context: copy.teacherWorkspace,
    actions: [
      {
        id: "calendar-open-availability",
        label: copy.openAvailability,
        icon: Plus,
        permission: "calendar.teacher.create",
        priority: 5,
        group: "primary",
        handler: () => setAvailabilityOpen(true),
      },
      {
        id: "calendar-block-time",
        label: copy.blockTime,
        icon: Ban,
        permission: "calendar.teacher.block",
        priority: 6,
        group: "primary",
        handler: () => setBlockOpen(true),
      },
      {
        id: "google-calendar",
        label: copy.googleCalendar,
        icon: CalendarDays,
        permission: "calendar.teacher.sync_google",
        priority: 10,
        group: "primary",
        handler: () => setSidePanel("calendar"),
      },
      {
        id: "calendar-insights",
        label: copy.schedulingInsights,
        icon: Sparkles,
        priority: 30,
        group: "secondary",
        handler: () => setSidePanel("insights"),
      },
      {
        id: "calendar-day-view",
        label: copy.dayTimeline,
        icon: CalendarDays,
        priority: 40,
        group: "view",
        disabled: view === "day",
        handler: () => setView("day"),
      },
      {
        id: "calendar-week-view",
        label: copy.workWeek,
        icon: CalendarDays,
        priority: 41,
        group: "view",
        disabled: view === "week",
        handler: () => setView("week"),
      },
      {
        id: "calendar-month-view",
        label: copy.monthView,
        icon: CalendarDays,
        priority: 42,
        group: "view",
        disabled: view === "month",
        handler: () => setView("month"),
      },
    ],
  }), [copy, view]);
  useMobilePageActions(mobilePage);

  if (loading || !insights) {
    return <div className="grid gap-4"><div className="h-32 animate-pulse rounded-lg bg-white" /><div className="h-96 animate-pulse rounded-lg bg-white" /></div>;
  }

  return (
    <div className="grid gap-5 pb-20 md:pb-0">
      <CalendarToolbar view={view} setView={setView} label={label} setLabel={setLabel} openAvailability={() => setAvailabilityOpen(true)} openBlock={() => setBlockOpen(true)} />
      <CalendarActionCenter
        integration={integration}
        sessions={sessions}
        onOpenCalendar={() => setSidePanel("calendar")}
        onHighlightNext={() => highlightSession(bookedSessions[0])}
        onHighlightToday={() => highlightSession(bookedSessions.find((item) => item.date === "2026-07-06") || bookedSessions[0])}
        onOpenInsights={() => setSidePanel("insights")}
      />
      <div className="grid min-w-0 gap-5">
        {view === "day" && <DayView sessions={sessions} emptySlots={emptySlots} onOpen={setSelectedSession} onInvite={setInviteSlot} highlightedSessionId={highlightedSessionId} />}
        {view === "week" && <WeekView sessions={sessions} emptySlots={emptySlots} onOpen={setSelectedSession} onInvite={setInviteSlot} highlightedSessionId={highlightedSessionId} />}
        {view === "month" && <MonthView sessions={sessions} emptySlots={emptySlots} onOpen={setSelectedSession} onInvite={setInviteSlot} highlightedSessionId={highlightedSessionId} />}
        <EmptySlotsPanel slots={emptySlots} onInvite={setInviteSlot} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[#EFE4D0] bg-white p-3 shadow-lg md:hidden">
        <Button onClick={() => setAvailabilityOpen(true)} className="min-w-0 flex-1 bg-[#E8704C] px-2 text-xs text-white"><Plus size={16} className="mr-1 shrink-0" /><span className="truncate">{copy.openAvailability}</span></Button>
        <Button onClick={() => setBlockOpen(true)} variant="outline" className="min-w-0 flex-1 px-2 text-xs"><Ban size={16} className="mr-1 shrink-0" /><span className="truncate">{copy.blockTime}</span></Button>
      </div>
      {availabilityOpen && <AvailabilityModal onClose={() => setAvailabilityOpen(false)} onSaved={(slot) => setSessions((items) => [...items, slot])} />}
      {blockOpen && <BlockTimeModal sessions={sessions} onClose={() => setBlockOpen(false)} onSaved={(block) => setSessions((items) => [...items, block])} />}
      {inviteSlot && <StudentInviteDrawer slot={inviteSlot} students={students} onClose={() => setInviteSlot(null)} />}
      {selectedSession && <StudentQuickViewDrawer session={selectedSession} student={selectedStudent} onClose={() => setSelectedSession(null)} onSessionUpdated={updateSession} />}
      {sidePanel === "calendar" && <WorkspaceSidePanel title={copy.googleCalendar} eyebrow={copy.calendarConnection} onClose={() => setSidePanel("")}><GoogleCalendarCard integration={integration} setIntegration={setIntegration} /></WorkspaceSidePanel>}
      {sidePanel === "insights" && <WorkspaceSidePanel title={copy.schedulingInsights} eyebrow={copy.operationalIntel} onClose={() => setSidePanel("")}><SchedulingInsightsPanel insights={insights} /></WorkspaceSidePanel>}
    </div>
  );
}
