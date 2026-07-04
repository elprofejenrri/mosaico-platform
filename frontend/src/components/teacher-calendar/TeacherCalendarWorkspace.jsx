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
import {
  blockTeacherTime,
  calendarStatuses,
  getTeacherCalendarWorkspace,
  saveTeacherAvailability,
  sendStudentInvitations,
  syncGoogleCalendar,
  updateClassSession,
} from "../../services/teacherCalendarService";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

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
  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.empty}`}>{calendarStatuses[status] || status}</span>;
}

function CalendarToolbar({ view, setView, label, setLabel, openAvailability, openBlock }) {
  const views = ["day", "week", "month"];
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Teacher workspace</p>
          <h1 className="mt-1 font-display text-4xl text-[#1F3B6E]">Teacher Calendar</h1>
          <p className="mt-1 text-sm text-[#5C6680]">Manage classes, availability, student invitations, calendar blocks, and scheduling health.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAvailability} className="bg-[#E8704C] text-white hover:bg-[#C95630]"><Plus size={16} className="mr-2" />Open availability</Button>
          <Button onClick={openBlock} variant="outline" className="border-[#EFE4D0]"><Ban size={16} className="mr-2" />Block time</Button>
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
          <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setLabel("Jul 6-12, 2026")}>Today</Button>
          <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setLabel("Next period")}><ChevronRight size={16} /></Button>
          <span className="rounded-md bg-[#FBF7EE] px-3 py-2 text-sm font-semibold text-[#1F3B6E]">{label}</span>
        </div>
      </div>
    </div>
  );
}

function CalendarSlotCard({ session, onOpen, compact = false }) {
  return (
    <button onClick={() => onOpen(session)} className={`w-full rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${statusStyles[session.status] || statusStyles.empty}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{session.start} - {session.end}</p>
          {!compact && <p className="mt-1 text-sm">{session.studentName || session.classType}</p>}
        </div>
        <MoreHorizontal size={16} />
      </div>
      {!compact && (
        <div className="mt-2 grid gap-1 text-xs">
          <p>{session.studentName ? `${session.classType} - ${session.level}` : session.reason || session.location || "Open slot"}</p>
          <p>{session.credits || 0} credits</p>
          {session.conflict && <p className="flex items-center gap-1"><AlertTriangle size={12} />{session.conflict}</p>}
        </div>
      )}
    </button>
  );
}

function DayView({ sessions, onOpen }) {
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <h2 className="font-display text-2xl text-[#1F3B6E]">Day timeline</h2>
      <div className="mt-4 grid gap-2">
        {hours.map((hour) => {
          const item = sessions.find((session) => session.start === hour);
          return (
            <div key={hour} className="grid grid-cols-[72px_1fr] gap-3">
              <p className="py-3 text-sm text-[#5C6680]">{hour}</p>
              {item ? <CalendarSlotCard session={item} onOpen={onOpen} /> : <div className={`rounded-lg border p-3 text-sm ${statusStyles.empty}`}>Empty gap</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ sessions, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <h2 className="font-display text-2xl text-[#1F3B6E]">Week view</h2>
      <div className="mt-4 grid min-w-[900px] grid-cols-7 gap-3">
        {days.map((day) => (
          <div key={day} className="rounded-lg bg-[#FBF7EE] p-3">
            <p className="font-semibold text-[#1F3B6E]">{day}</p>
            <div className="mt-3 grid gap-2">
              {sessions.filter((session) => session.day === day).map((session) => <CalendarSlotCard key={session.id} session={session} onOpen={onOpen} />)}
              {sessions.filter((session) => session.day === day).length === 0 && <div className={`rounded-lg border p-3 text-sm ${statusStyles.empty}`}>No scheduled items</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthView({ sessions, onOpen }) {
  const dates = Array.from({ length: 30 }, (_, idx) => idx + 1);
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <h2 className="font-display text-2xl text-[#1F3B6E]">Month view</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {dates.map((date) => {
          const key = `2026-07-${String(date).padStart(2, "0")}`;
          const daySessions = sessions.filter((session) => session.date === key);
          return (
            <div key={date} className="min-h-28 rounded-lg border border-[#EFE4D0] bg-[#FBF7EE] p-3">
              <p className="font-semibold text-[#1F3B6E]">Jul {date}</p>
              <div className="mt-2 grid gap-1">
                {daySessions.slice(0, 3).map((session) => <CalendarSlotCard key={session.id} session={session} onOpen={onOpen} compact />)}
                {daySessions.length === 0 && <p className="text-xs text-[#5C6680]">No items</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingClassesPanel({ sessions, onOpen }) {
  const booked = sessions.filter((item) => ["booked", "conflict"].includes(item.status));
  const next = booked[0];
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
        <h2 className="font-display text-xl text-[#1F3B6E]">Next class</h2>
        {next ? <CalendarSlotCard session={next} onOpen={onOpen} /> : <p className="mt-3 text-sm text-[#5C6680]">No class scheduled. Open availability or invite students.</p>}
      </div>
      <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
        <h2 className="font-display text-xl text-[#1F3B6E]">Today's classes</h2>
        <div className="mt-3 grid gap-2">{booked.slice(0, 3).map((item) => <CalendarSlotCard key={item.id} session={item} onOpen={onOpen} />)}</div>
      </div>
      <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
        <h2 className="font-display text-xl text-[#1F3B6E]">This week</h2>
        <p className="mt-2 text-sm text-[#5C6680]">{booked.length} booked or conflict classes.</p>
      </div>
    </div>
  );
}

function GoogleCalendarCard({ integration, setIntegration }) {
  const [loading, setLoading] = useState(false);
  const sync = async (nextState = {}) => {
    setLoading(true);
    try {
      const next = await syncGoogleCalendar(nextState);
      setIntegration(next);
      toast.success("Google Calendar sync updated.");
    } catch {
      toast.error("Calendar sync failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5C6680]">Google Calendar</p>
          <h2 className="mt-1 font-display text-xl text-[#1F3B6E]">{integration.status === "connected" ? "Connected" : "Not connected"}</h2>
          <p className="mt-1 text-sm text-[#5C6680]">Last synced: {integration.lastSyncedAt || "Never"}</p>
        </div>
        <StatusBadge status={integration.status === "connected" ? "completed" : "conflict"} />
      </div>
      <div className="mt-4 grid gap-2">
        <Select value={integration.syncDirection || "busy-only"} onChange={(event) => sync({ syncDirection: event.target.value })}>
          <option value="busy-only">Import busy events only</option>
          <option value="export">Export Mosaico classes</option>
          <option value="two-way">Two-way sync</option>
        </Select>
        <Button disabled={loading} onClick={() => sync()} className="bg-[#1F3B6E] text-white hover:bg-[#162B52]"><RefreshCw size={16} className="mr-2" />{loading ? "Syncing..." : "Sync now"}</Button>
        <Button onClick={() => sync({ status: integration.status === "connected" ? "not-connected" : "connected" })} variant="outline" className="border-[#EFE4D0]">
          <LinkIcon size={16} className="mr-2" />{integration.status === "connected" ? "Disconnect" : "Connect Google Calendar"}
        </Button>
        {integration.conflicts > 0 && <p className="rounded-md bg-[#FFF9E8] p-3 text-sm text-[#9A6A00]">{integration.conflicts} Google Calendar conflict needs review.</p>}
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

function AvailabilityModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ template: "Regular schedule", days: ["Mon"], startTime: "09:00", endTime: "12:00", duration: 60, buffer: 10, maxClasses: 4, location: "Online", active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setError("");
    if (form.endTime <= form.startTime) {
      setError("End time must be after start time.");
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
        <div className="grid grid-cols-3 gap-3"><Field label="Slot duration"><Input type="number" value={form.duration} onChange={(event) => update("duration", Number(event.target.value))} /></Field><Field label="Buffer"><Input type="number" value={form.buffer} onChange={(event) => update("buffer", Number(event.target.value))} /></Field><Field label="Max/day"><Input type="number" value={form.maxClasses} onChange={(event) => update("maxClasses", Number(event.target.value))} /></Field></div>
        <Field label="Location"><Select value={form.location} onChange={(event) => update("location", event.target.value)}><option>Online</option><option>Campus</option><option>Hybrid</option></Select></Field>
        <div className="grid gap-2 rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]"><button onClick={() => toast.success("Monday schedule copied.")} className="text-left">Copy Monday schedule to selected days</button><button onClick={() => toast.success("Previous week duplicated.")} className="text-left">Duplicate previous week</button><button onClick={() => toast.success("Bulk edit staged.")} className="text-left">Bulk edit selected slots</button></div>
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
          <Button variant="outline" onClick={() => toast.success("Student profile opened.")}><UserRound size={16} className="mr-2" />Open profile</Button>
          <Button variant="outline" onClick={() => toast.success("Message draft opened.")}><MessageCircle size={16} className="mr-2" />Message</Button>
          <Button variant="outline" onClick={() => runAction("reschedule", { date: "2026-07-12", start: "17:00", end: "18:00" })}><Clock size={16} className="mr-2" />Reschedule</Button>
          <Button variant="outline" onClick={() => runAction("cancel", { reason: "Teacher cancelled" })}><Ban size={16} className="mr-2" />Cancel</Button>
          <Button disabled={loadingAction === "complete"} onClick={() => runAction("complete")} className="bg-[#2DA89F] text-white hover:bg-[#23877f]"><Check size={16} className="mr-2" />Mark completed</Button>
          <Button variant="outline" onClick={() => runAction("noshow", { notes: feedback })}>Mark no-show</Button>
          <Button variant="outline" onClick={() => runAction("late", { notes: feedback })}>Mark late</Button>
          <Button variant="outline" onClick={() => toast.success("Homework added.")}>Add homework</Button>
        </div>
      </div>
    </Modal>
  );
}

function EmptySlotsPanel({ slots, onInvite }) {
  return (
    <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-[#1F3B6E]">Empty slots and fill rate</h2>
      <div className="mt-4 grid gap-3">
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-lg border border-[#EFE4D0] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{slot.date} - {slot.start}-{slot.end}</p><p className="text-sm text-[#5C6680]">{slot.suggestion}</p></div>
              <span className="rounded-md bg-[#FFF9E8] px-2 py-1 text-xs text-[#9A6A00]">{slot.demand} demand</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => onInvite(slot)} variant="outline" className="border-[#EFE4D0]"><Mail size={16} className="mr-2" />Invite students</Button>
              <Button onClick={() => toast.success("Slot shared.")} variant="outline" className="border-[#EFE4D0]">Share slot</Button>
              <Button onClick={() => toast.success("Slot closed.")} variant="outline" className="border-[#EFE4D0]">Close slot</Button>
              <Button onClick={() => toast.success("Waitlist campaign staged.")} variant="outline" className="border-[#EFE4D0]">Waitlist campaign</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherCalendarWorkspace() {
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

  if (loading || !insights) {
    return <div className="grid gap-4"><div className="h-32 animate-pulse rounded-lg bg-white" /><div className="h-96 animate-pulse rounded-lg bg-white" /></div>;
  }

  return (
    <div className="grid gap-5">
      <CalendarToolbar view={view} setView={setView} label={label} setLabel={setLabel} openAvailability={() => setAvailabilityOpen(true)} openBlock={() => setBlockOpen(true)} />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          {view === "day" && <DayView sessions={sessions} onOpen={setSelectedSession} />}
          {view === "week" && <WeekView sessions={sessions} onOpen={setSelectedSession} />}
          {view === "month" && <MonthView sessions={sessions} onOpen={setSelectedSession} />}
          <EmptySlotsPanel slots={emptySlots} onInvite={setInviteSlot} />
        </div>
        <aside className="grid h-fit gap-5">
          <GoogleCalendarCard integration={integration} setIntegration={setIntegration} />
          <UpcomingClassesPanel sessions={sessions} onOpen={setSelectedSession} />
          <SchedulingInsightsPanel insights={insights} />
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[#EFE4D0] bg-white p-3 shadow-lg md:hidden">
        <Button onClick={() => setAvailabilityOpen(true)} className="flex-1 bg-[#E8704C] text-white"><Plus size={16} className="mr-2" />Open</Button>
        <Button onClick={() => setBlockOpen(true)} variant="outline" className="flex-1"><Ban size={16} className="mr-2" />Block</Button>
        <Button onClick={() => setView("day")} variant="outline" className="flex-1"><CalendarDays size={16} className="mr-2" />Day</Button>
      </div>
      {availabilityOpen && <AvailabilityModal onClose={() => setAvailabilityOpen(false)} onSaved={(slot) => setSessions((items) => [...items, slot])} />}
      {blockOpen && <BlockTimeModal sessions={sessions} onClose={() => setBlockOpen(false)} onSaved={(block) => setSessions((items) => [...items, block])} />}
      {inviteSlot && <StudentInviteDrawer slot={inviteSlot} students={students} onClose={() => setInviteSlot(null)} />}
      {selectedSession && <StudentQuickViewDrawer session={selectedSession} student={selectedStudent} onClose={() => setSelectedSession(null)} onSessionUpdated={updateSession} />}
    </div>
  );
}
