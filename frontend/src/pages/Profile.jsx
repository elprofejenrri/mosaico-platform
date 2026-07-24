import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, Building2, Camera, Check, ChevronDown, Clock3,
  FileCheck2, LoaderCircle, LockKeyhole, Pencil, Save, ShieldCheck, UserRound,
  UsersRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { parseProfileList, profileAllowsAudit, profileInitials } from "../lib/profile";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

const tabs = [
  ["general", "General", UserRound],
  ["information", "Information", FileCheck2],
  ["preferences", "Preferences", Check],
  ["security", "Security", LockKeyhole],
  ["activity", "Activity", Activity],
  ["audit", "Audit", ShieldCheck],
];

const detailFields = {
  alumno: [
    ["current_level", "Current level", "text"],
    ["learning_goal", "Learning goal", "textarea"],
    ["preferred_class_types", "Preferred class types", "list"],
    ["general_availability", "General availability", "textarea"],
  ],
  profesor: [
    ["biography", "Professional biography", "textarea"],
    ["teaching_languages", "Languages taught", "list"],
    ["specialties", "Specialties", "list"],
    ["authorized_levels", "Authorized levels", "list"],
    ["certifications", "Certifications", "list"],
    ["modalities", "Modalities", "list"],
    ["intro_video_url", "Introduction video URL", "url"],
  ],
  tutor_padre: [["relationship_summary", "Relationship summary", "textarea"]],
  administrador_escolar: [
    ["institution_name", "Institution", "text"],
    ["job_title", "Position", "text"],
    ["contact_email", "Contact email", "email"],
    ["contact_phone", "Contact phone", "tel"],
  ],
  finanzas: [["job_title", "Position", "text"]],
  administrador_profesor: [["technical_role", "Technical role", "text"]],
  administrador_sitio: [["technical_role", "Technical role", "text"]],
};

const copy = {
  en: {
    title: "Your profile",
    subtitle: "Identity, preferences, and role information in one secure place.",
    edit: "Edit profile",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving…",
    loading: "Loading profile",
    retry: "Try again",
    created: "Created",
    lastAccess: "Last access",
    completion: "Profile completion",
    personal: "Personal information",
    academic: "Role information",
    preferences: "Preferences",
    security: "Security",
    activity: "Recent activity",
    audit: "Audit trail",
    empty: "There is no activity to show yet.",
    linked: "Linked students",
    schools: "Authorized schools",
    scopes: "RBAC scopes",
    noSchools: "No school assignments.",
    noStudents: "No active student links.",
  },
  es: {
    title: "Tu perfil",
    subtitle: "Identidad, preferencias e información del rol en un solo lugar seguro.",
    edit: "Editar perfil",
    cancel: "Cancelar",
    save: "Guardar cambios",
    saving: "Guardando…",
    loading: "Cargando perfil",
    retry: "Intentar de nuevo",
    created: "Creado",
    lastAccess: "Último acceso",
    completion: "Perfil completado",
    personal: "Información personal",
    academic: "Información del rol",
    preferences: "Preferencias",
    security: "Seguridad",
    activity: "Actividad reciente",
    audit: "Auditoría",
    empty: "Todavía no hay actividad para mostrar.",
    linked: "Estudiantes vinculados",
    schools: "Escuelas autorizadas",
    scopes: "Alcances RBAC",
    noSchools: "Sin asignaciones de escuela.",
    noStudents: "Sin estudiantes vinculados activos.",
  },
};

function Field({ label, value, name, type = "text", editing, onChange }) {
  const display = Array.isArray(value) ? value.join(", ") : value;
  if (!editing) {
    return (
      <div className="min-w-0 rounded-xl border border-[#EFE4D0] bg-[#FBF7EE]/70 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5C6680] dark:text-slate-400">{label}</p>
        <p className="mt-2 break-words text-sm font-medium text-[#1F3B6E] dark:text-slate-100">{display || "—"}</p>
      </div>
    );
  }
  const commonProps = {
    id: name,
    value: display || "",
    onChange: (event) => onChange(name, type === "list"
      ? parseProfileList(event.target.value)
      : event.target.value),
    className: "mt-2 bg-white dark:bg-slate-950",
  };
  return (
    <label htmlFor={name} className="block text-sm font-semibold text-[#1F3B6E] dark:text-slate-100">
      {label}
      {type === "textarea"
        ? <Textarea {...commonProps} rows={4} />
        : <Input {...commonProps} type={type === "list" ? "text" : type} />}
      {type === "list" && <span className="mt-1 block text-xs font-normal text-[#5C6680]">Separate values with commas.</span>}
    </label>
  );
}

function StatusBadge({ profile }) {
  const status = profile.role === "profesor" ? profile.approvalStatus : profile.completion.status;
  const styles = {
    approved: "bg-emerald-100 text-emerald-800",
    complete: "bg-emerald-100 text-emerald-800",
    active: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    onboarding: "bg-sky-100 text-sky-800",
    incomplete: "bg-amber-100 text-amber-800",
    suspended: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;
}

function Timeline({ items, empty, audit = false }) {
  if (!items?.length) {
    return <div className="rounded-xl border border-dashed border-[#DCCDB5] p-8 text-center text-sm text-[#5C6680]">{empty}</div>;
  }
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-[#EFE4D0] bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#1F3B6E] dark:text-white">
                {audit ? item.event_type || item.action : item.summary || item.event_type}
              </p>
              <p className="mt-1 text-xs text-[#5C6680] dark:text-slate-400">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
            {audit && <span className="rounded-full bg-[#FBF7EE] px-2 py-1 text-[11px] font-semibold uppercase text-[#5C6680]">{item.result || "success"}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Profile() {
  const { lang, checkAuth } = useApp();
  const text = copy[lang] || copy.en;
  const [profile, setProfile] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [form, setForm] = useState({ common: {}, details: {} });
  const [tab, setTab] = useState("general");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const load = async (role = "") => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/profile", { params: role ? { role } : {} });
      setProfile(response.data);
      setSelectedRole(response.data.role);
      setForm({ common: response.data.common || {}, details: response.data.details || {} });
    } catch (requestError) {
      setError(requestError.appError?.message || "Could not load the profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const theme = form.common.preferences?.theme || "system";
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media?.matches));
    };
    applyTheme();
    media?.addEventListener?.("change", applyTheme);
    return () => media?.removeEventListener?.("change", applyTheme);
  }, [form.common.preferences?.theme]);

  const visibleTabs = useMemo(
    () => tabs.filter(([id]) => id !== "audit" || profileAllowsAudit(profile)),
    [profile],
  );

  const updateCommon = (name, value) => setForm((current) => ({
    ...current,
    common: { ...current.common, [name]: value },
  }));
  const updateDetails = (name, value) => setForm((current) => ({
    ...current,
    details: { ...current.details, [name]: value },
  }));
  const updatePreference = (name, value) => setForm((current) => ({
    ...current,
    common: {
      ...current.common,
      preferences: { ...(current.common.preferences || {}), [name]: value },
    },
  }));

  const save = async () => {
    setSaving(true);
    try {
      const response = await api.patch("/profile", {
        role: selectedRole,
        common: form.common,
        details: form.details,
      });
      setProfile(response.data);
      setForm({ common: response.data.common, details: response.data.details });
      setEditing(false);
      await checkAuth();
      toast.success(lang === "es" ? "Perfil guardado." : "Profile saved.");
    } catch (requestError) {
      toast.error(requestError.appError?.message || "Could not save the profile.");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    setSaving(true);
    try {
      await api.post("/profile/photo", data, { headers: { "Content-Type": "multipart/form-data" } });
      await load(selectedRole);
      await checkAuth();
      toast.success(lang === "es" ? "Fotografía actualizada." : "Photo updated.");
    } catch (requestError) {
      toast.error(requestError.appError?.message || "Could not upload the photo.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center px-6" role="status">
        <LoaderCircle className="mr-3 animate-spin text-[#E8704C]" aria-hidden="true" />
        <span>{text.loading}</span>
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <AlertCircle className="mx-auto text-red-600" size={36} aria-hidden="true" />
        <h1 className="mt-4 text-2xl">Profile unavailable</h1>
        <p className="mt-2 text-[#5C6680]">{error}</p>
        <Button className="mt-6" onClick={() => load()}>{text.retry}</Button>
      </div>
    );
  }

  const initials = profileInitials(form.common.public_name, profile.email);
  const roleFields = detailFields[profile.role] || [];
  const date = (value) => value ? new Date(value).toLocaleDateString() : "—";

  return (
    <div className="min-h-screen bg-[#FBF7EE] px-4 py-8 text-[#1F3B6E] dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-2xl border border-[#EFE4D0] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-24 bg-gradient-to-r from-[#1F3B6E] via-[#2DA89F] to-[#E8704C]" />
          <div className="flex flex-col gap-5 px-5 pb-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative w-fit">
                <Avatar className="h-24 w-24 border-4 border-white bg-[#FFF0E6] shadow-md dark:border-slate-900">
                  <AvatarImage src={form.common.picture} alt="" />
                  <AvatarFallback className="text-xl font-bold text-[#1F3B6E]">{initials}</AvatarFallback>
                </Avatar>
                {editing && (
                  <>
                    <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 rounded-full bg-[#E8704C] p-2 text-white shadow focus:outline-none focus:ring-2 focus:ring-[#1F3B6E]" aria-label="Change profile photo">
                      <Camera size={16} aria-hidden="true" />
                    </button>
                    <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
                  </>
                )}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold sm:text-3xl">{form.common.public_name || profile.email}</h1>
                  <StatusBadge profile={profile} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#5C6680] dark:text-slate-400">
                  {profile.availableRoles.length > 1 ? (
                    <label className="relative">
                      <span className="sr-only">Active profile</span>
                      <select
                        value={selectedRole}
                        onChange={(event) => {
                          setEditing(false);
                          load(event.target.value);
                        }}
                        className="appearance-none rounded-md border border-[#EFE4D0] bg-white py-1 pl-2 pr-7 font-semibold text-[#1F3B6E] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {profile.availableRoles.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2" aria-hidden="true" />
                    </label>
                  ) : <span className="font-semibold">{profile.roleLabel}</span>}
                  <span>{text.created}: {date(profile.createdAt)}</span>
                  <span>{text.lastAccess}: {date(profile.lastLoginAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setForm({ common: profile.common, details: profile.details });
                    setEditing(false);
                  }} disabled={saving}><X className="mr-2" size={16} />{text.cancel}</Button>
                  <Button onClick={save} disabled={saving} className="bg-[#E8704C] hover:bg-[#C95630]">
                    {saving ? <LoaderCircle className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                    {saving ? text.saving : text.save}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} disabled={!profile.canEdit} className="bg-[#E8704C] hover:bg-[#C95630]">
                  <Pencil className="mr-2" size={16} />{text.edit}
                </Button>
              )}
            </div>
          </div>
          <div className="border-t border-[#EFE4D0] px-5 py-4 dark:border-slate-700 sm:px-8">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold">{text.completion}</span>
              <span>{profile.completion.percentage}% · {profile.completion.nextStep}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EFE4D0]" role="progressbar" aria-valuenow={profile.completion.percentage} aria-valuemin="0" aria-valuemax="100">
              <div className="h-full rounded-full bg-[#2DA89F] transition-all" style={{ width: `${profile.completion.percentage}%` }} />
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav className="h-fit rounded-2xl border border-[#EFE4D0] bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label="Profile sections">
            {visibleTabs.map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold ${tab === id ? "bg-[#FFF0E6] text-[#E8704C] dark:bg-slate-800" : "hover:bg-[#FBF7EE] dark:hover:bg-slate-800"}`}>
                <Icon size={17} aria-hidden="true" />{label}
              </button>
            ))}
          </nav>

          <main className="rounded-2xl border border-[#EFE4D0] bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            {tab === "general" && (
              <section>
                <h2 className="text-2xl">{text.personal}</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="First name" name="first_name" value={form.common.first_name} editing={editing} onChange={updateCommon} />
                  <Field label="Last name" name="last_name" value={form.common.last_name} editing={editing} onChange={updateCommon} />
                  <Field label="Public name" name="public_name" value={form.common.public_name} editing={editing} onChange={updateCommon} />
                  <Field label="Phone" name="phone" type="tel" value={form.common.phone} editing={editing} onChange={updateCommon} />
                  <Field label="Country code" name="country" value={form.common.country} editing={editing} onChange={updateCommon} />
                  <Field label="Time zone" name="timezone" value={form.common.timezone} editing={editing} onChange={updateCommon} />
                  <Field label="Native language" name="native_language" value={form.common.native_language} editing={editing} onChange={updateCommon} />
                  <Field label="Learning language" name="learning_language" value={form.common.learning_language} editing={editing} onChange={updateCommon} />
                </div>
              </section>
            )}
            {tab === "information" && (
              <section>
                <h2 className="text-2xl">{text.academic}</h2>
                {profile.role === "profesor" && profile.approvalStatus !== "approved" && (
                  <div className={`mt-4 rounded-xl border p-4 text-sm ${profile.approvalStatus === "suspended" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`} role="status">
                    Classes remain unavailable while teacher approval is {profile.approvalStatus}.
                  </div>
                )}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {roleFields.map(([name, label, type]) => <Field key={name} label={label} name={name} type={type} value={form.details[name]} editing={editing} onChange={updateDetails} />)}
                </div>
                {profile.role === "tutor_padre" && (
                  <div className="mt-8">
                    <h3 className="flex items-center gap-2 text-lg"><UsersRound size={19} />{text.linked}</h3>
                    <div className="mt-3 grid gap-3">
                      {profile.linkedStudents.length ? profile.linkedStudents.map((student) => (
                        <div key={student.userId} className="rounded-xl border border-[#EFE4D0] p-4">
                          <p className="font-semibold">{student.name}</p>
                          <p className="mt-1 text-sm capitalize text-[#5C6680]">{student.relationship} · {student.status}</p>
                        </div>
                      )) : <p className="text-sm text-[#5C6680]">{text.noStudents}</p>}
                    </div>
                  </div>
                )}
                {["administrador_escolar", "finanzas"].includes(profile.role) && (
                  <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg"><Building2 size={19} />{text.schools}</h3>
                      <div className="mt-3 space-y-2">
                        {profile.schools.length ? profile.schools.map((school) => <p key={school.id} className="rounded-xl border border-[#EFE4D0] p-3 font-semibold">{school.name}</p>) : <p className="text-sm text-[#5C6680]">{text.noSchools}</p>}
                      </div>
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 text-lg"><ShieldCheck size={19} />{text.scopes}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">{profile.scopes.map((scope) => <span key={scope} className="rounded-full bg-[#FFF0E6] px-3 py-1 text-xs font-bold text-[#E8704C]">{scope}</span>)}</div>
                    </div>
                  </div>
                )}
                {["administrador_profesor", "administrador_sitio"].includes(profile.role) && (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Field label="Access level" value={profile.scopes.includes("global") ? "Global" : profile.scopes.join(", ")} />
                    <Field label="Last access" value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "—"} />
                  </div>
                )}
              </section>
            )}
            {tab === "preferences" && (
              <section>
                <h2 className="text-2xl">{text.preferences}</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Interface language" name="interface_language" value={form.common.preferences?.interface_language} editing={editing} onChange={updatePreference} />
                  <Field label="Theme" name="theme" value={form.common.preferences?.theme} editing={editing} onChange={updatePreference} />
                  {[
                    ["email_notifications", "Email notifications"],
                    ["learning_reminders", "Learning reminders"],
                    ["reduced_motion", "Reduced motion"],
                    ["high_contrast", "High contrast"],
                  ].map(([name, label]) => (
                    <label key={name} className="flex items-center justify-between rounded-xl border border-[#EFE4D0] p-4">
                      <span className="text-sm font-semibold">{label}</span>
                      <input type="checkbox" checked={Boolean(form.common.preferences?.[name])} disabled={!editing} onChange={(event) => updatePreference(name, event.target.checked)} className="h-5 w-5 accent-[#E8704C]" />
                    </label>
                  ))}
                </div>
              </section>
            )}
            {tab === "security" && (
              <section>
                <h2 className="text-2xl">{text.security}</h2>
                <p className="mt-2 text-sm text-[#5C6680]">Authentication settings are read-only here. Role and permission changes remain in IAM.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Email" value={profile.email} />
                  <Field label="Authentication provider" value={profile.authProvider} />
                  <Field label="Account status" value={profile.accountStatus} />
                  <Field label="Role" value={profile.roleLabel} />
                </div>
              </section>
            )}
            {tab === "activity" && <section><h2 className="mb-5 flex items-center gap-2 text-2xl"><Clock3 size={22} />{text.activity}</h2><Timeline items={profile.activity} empty={text.empty} /></section>}
            {tab === "audit" && profile.canViewAudit && <section><h2 className="mb-5 text-2xl">{text.audit}</h2><Timeline items={profile.audit} empty={text.empty} audit /></section>}
          </main>
        </div>
      </div>
    </div>
  );
}
