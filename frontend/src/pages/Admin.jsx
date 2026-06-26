import React, { useEffect, useState } from "react";
import { useApp, startGoogleAuth } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { ImageUpload } from "../components/ImageUpload";
import { ContentTab } from "../components/ContentTab";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Copy, FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-[0.18em] text-[#5C6680] font-semibold">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const ADMIN_ROLES = ["administrador_sitio", "administrador_profesor"];
const CMS_ROLES = ["administrador_sitio", "editor_cms"];
const canAdmin = (user) => ADMIN_ROLES.includes(user?.role) || user?.role === "admin";
const canCms = (user) => CMS_ROLES.includes(user?.role) || user?.role === "admin";

const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    green: "bg-[#E0F2F0] text-[#2DA89F]",
    orange: "bg-[#FFF0E6] text-[#E8704C]",
    blue: "bg-[#E9F1FF] text-[#1F3B6E]",
    neutral: "bg-[#F4EFE7] text-[#5C6680]",
  };
  return <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${tones[tone]}`}>{children}</span>;
};

// ---------- Teachers ----------
function TeachersTab() {
  const empty = { name: "", email: "", bio_en: "", bio_es: "", picture: "", active: true };
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    try { setList((await api.get("/admin/teachers")).data); } catch { /* */ }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing("__new"); setForm(empty); };
  const openEdit = (t) => { setEditing(t.id); setForm({ ...empty, ...t }); };

  const save = async () => {
    try {
      if (editing === "__new") await api.post("/admin/teachers", form);
      else await api.patch(`/admin/teachers/${editing}`, form);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete teacher?")) return;
    try { await api.delete(`/admin/teachers/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-2xl">Teachers</h3>
        <Button onClick={openNew} data-testid="add-teacher-btn" className="rounded-full bg-[#E8704C] text-white hover:bg-[#C95630]">
          <Plus size={14} className="mr-1" /> Add teacher
        </Button>
      </div>
      <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
        {list.length === 0 && <p className="p-6 text-sm text-[#5C6680]">No teachers yet.</p>}
        {list.map((t) => (
          <div key={t.id} className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {t.picture ? <img src={t.picture} alt="" className="w-12 h-12 rounded-full object-cover" /> :
                <div className="w-12 h-12 rounded-full bg-[#FFF0E6] flex items-center justify-center font-display text-[#E8704C]">{t.name?.[0] || "?"}</div>}
              <div className="min-w-0">
                <p className="font-medium truncate">{t.name}</p>
                <p className="text-xs text-[#5C6680] truncate">{t.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full ${t.active ? "bg-[#E0F2F0] text-[#2DA89F]" : "bg-[#FFF0E6] text-[#5C6680]"}`}>{t.active ? "Active" : "Hidden"}</span>
              <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`edit-teacher-${t.id}`}><Pencil size={14} /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(t.id)} data-testid={`del-teacher-${t.id}`}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing === "__new" ? "New teacher" : "Edit teacher"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="teacher-name" /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="teacher-email" /></Field>
            <Field label="Picture"><ImageUpload value={form.picture} onChange={(v) => setForm({ ...form, picture: v })} testid="teacher-pic" /></Field>
            <Field label="Active"><div className="pt-2"><Switch checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div></Field>
            <div className="col-span-2"><Field label="Bio (EN)"><Textarea rows={3} value={form.bio_en} onChange={(e) => setForm({ ...form, bio_en: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Bio (ES)"><Textarea rows={3} value={form.bio_es} onChange={(e) => setForm({ ...form, bio_es: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} data-testid="save-teacher" className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Products (Classes) CMS ----------
function ProductsTab() {
  const empty = { id: "", slug: "", name_en: "", name_es: "", description_en: "", description_es: "",
    duration_min: 60, sessions_included: 1, price_usd: 30, currency: "USD", type: "single",
    teacher_id: "", capacity: 1, active: true, image: "", language: "es", popular: false };
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => { try { setList((await api.get("/products")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const body = { ...form, duration_min: Number(form.duration_min), sessions_included: Number(form.sessions_included), price_usd: Number(form.price_usd), capacity: Number(form.capacity || 1) };
      if (editing === "__new") await api.post("/admin/products", body);
      else await api.patch(`/admin/products/${editing}`, body);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete class?")) return;
    try { await api.delete(`/admin/products/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-2xl">Classes (CMS)</h3>
        <Button onClick={() => { setForm(empty); setEditing("__new"); }} data-testid="add-product-btn" className="rounded-full bg-[#E8704C] text-white hover:bg-[#C95630]">
          <Plus size={14} className="mr-1" /> Add class
        </Button>
      </div>
      <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
        {list.map((p) => (
          <div key={p.id} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium">{p.name_en} <span className="text-xs text-[#5C6680]">· {p.name_es}</span></p>
              <p className="text-xs text-[#5C6680] mt-1">{p.id} · {p.type} · {p.duration_min}min · ${p.price_usd}{p.popular && " · ★ popular"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setForm({ ...empty, ...p }); setEditing(p.id); }} data-testid={`edit-product-${p.id}`}><Pencil size={14} /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)} data-testid={`del-product-${p.id}`}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing === "__new" ? "New class" : "Edit class"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <Field label="ID (slug-like, unique)"><Input value={form.id} disabled={editing !== "__new"} onChange={(e) => setForm({ ...form, id: e.target.value })} /></Field>
            <Field label="URL slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Name (EN)"><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
            <Field label="Name (ES)"><Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-[#EFE4D0] bg-white text-sm">
                <option value="trial">prueba gratis</option><option value="single">clase individual</option>
                <option value="package">paquete</option><option value="course">curso</option><option value="subscription">suscripcion</option>
              </select>
            </Field>
            <Field label="Duration (min)"><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
            <Field label="Sessions included"><Input type="number" value={form.sessions_included} onChange={(e) => setForm({ ...form, sessions_included: e.target.value })} /></Field>
            <Field label="Price (USD)"><Input type="number" step="0.01" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} /></Field>
            <Field label="Currency"><Input value={form.currency || "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
            <Field label="Capacity"><Input type="number" value={form.capacity || 1} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            <Field label="Language"><select value={form.language || "es"} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full h-10 px-3 rounded-md border border-[#EFE4D0] bg-white text-sm"><option value="es">es</option><option value="en">en</option></select></Field>
            <Field label="Active"><div className="pt-2"><Switch checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div></Field>
            <Field label="Popular"><div className="pt-2"><Switch checked={!!form.popular} onCheckedChange={(v) => setForm({ ...form, popular: v })} /></div></Field>
            <div className="col-span-2"><Field label="Image"><ImageUpload value={form.image} onChange={(v) => setForm({ ...form, image: v })} testid="product-image" /></Field></div>
            <div className="col-span-2"><Field label="Description (EN)"><Textarea rows={2} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Description (ES)"><Textarea rows={2} value={form.description_es} onChange={(e) => setForm({ ...form, description_es: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} data-testid="save-product" className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Blog CMS ----------
function BlogTab() {
  const empty = { slug: "", title_en: "", title_es: "", excerpt_en: "", excerpt_es: "",
    body_en: "", body_es: "", cover_image: "", published: true };
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);  // slug or "__new"
  const [form, setForm] = useState(empty);

  const load = async () => { try { setList((await api.get("/admin/blog")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing === "__new") await api.post("/admin/blog", form);
      else await api.patch(`/admin/blog/${editing}`, form);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const remove = async (slug) => {
    if (!window.confirm("Delete post?")) return;
    try { await api.delete(`/admin/blog/${slug}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-2xl">Blog (CMS)</h3>
        <Button onClick={() => { setForm(empty); setEditing("__new"); }} data-testid="add-post-btn" className="rounded-full bg-[#E8704C] text-white hover:bg-[#C95630]">
          <Plus size={14} className="mr-1" /> Add post
        </Button>
      </div>
      <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
        {list.map((p) => (
          <div key={p.slug} className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {p.cover_image ? <img src={p.cover_image} alt="" className="w-14 h-14 rounded-lg object-cover" /> :
                <div className="w-14 h-14 rounded-lg bg-[#FFF0E6]" />}
              <div className="min-w-0">
                <p className="font-medium truncate">{p.title_en}</p>
                <p className="text-xs text-[#5C6680] truncate">/{p.slug} · {p.published ? "published" : "draft"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setForm({ ...empty, ...p }); setEditing(p.slug); }} data-testid={`edit-post-${p.slug}`}><Pencil size={14} /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p.slug)} data-testid={`del-post-${p.slug}`}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="p-6 text-sm text-[#5C6680]">No posts yet.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{editing === "__new" ? "New post" : "Edit post"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
            <Field label="Slug (URL)"><Input value={form.slug} disabled={editing !== "__new"} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Published"><div className="pt-2"><Switch checked={!!form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /></div></Field>
            <Field label="Title (EN)"><Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></Field>
            <Field label="Title (ES)"><Input value={form.title_es} onChange={(e) => setForm({ ...form, title_es: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Cover image"><ImageUpload value={form.cover_image} onChange={(v) => setForm({ ...form, cover_image: v })} testid="post-cover" /></Field></div>
            <div className="col-span-2"><Field label="Excerpt (EN)"><Textarea rows={2} value={form.excerpt_en} onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Excerpt (ES)"><Textarea rows={2} value={form.excerpt_es} onChange={(e) => setForm({ ...form, excerpt_es: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Body (EN)"><Textarea rows={8} value={form.body_en} onChange={(e) => setForm({ ...form, body_en: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Body (ES)"><Textarea rows={8} value={form.body_es} onChange={(e) => setForm({ ...form, body_es: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} data-testid="save-post" className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Bookings + Students + Availability (unchanged behavior) ----------
function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const load = async () => { try { setBookings((await api.get("/admin/bookings")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);
  const update = async (id, patch) => { try { await api.patch(`/admin/bookings/${id}`, patch); toast.success("Saved"); load(); } catch { toast.error("Failed"); } };
  return (
    <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
      {bookings.length === 0 && <p className="p-6 text-sm text-[#5C6680]">No bookings yet.</p>}
      {bookings.map((b) => (
        <div key={b.id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-3"><p className="font-medium">{b.user_name}</p><p className="text-xs text-[#5C6680]">{b.user_email}</p></div>
          <div className="md:col-span-3 text-sm"><p>{b.product_name}</p><p className="text-xs text-[#5C6680]">{b.scheduled_date} · {b.scheduled_time} · {b.timezone}</p>{b.teacher_name && <p className="text-xs text-[#E8704C] mt-1">→ {b.teacher_name}</p>}</div>
          <div className="md:col-span-4">
            <Input defaultValue={b.meeting_link || ""} placeholder="Paste Google Meet link"
              onBlur={(e) => { if (e.target.value !== (b.meeting_link || "")) update(b.id, { meeting_link: e.target.value }); }}
              data-testid={`meet-input-${b.id}`} className="border-[#EFE4D0]" />
          </div>
          <div className="md:col-span-2 text-right">
            <select defaultValue={b.status} onChange={(e) => update(b.id, { status: e.target.value })}
              data-testid={`status-${b.id}`} className="border border-[#EFE4D0] bg-white px-2 py-1 text-xs rounded">
              <option value="confirmed">confirmed</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState([]);
  useEffect(() => { api.get("/admin/students").then((r) => setStudents(r.data)).catch(() => {}); }, []);
  return (
    <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
      {students.map((s) => (
        <div key={s.user_id} className="p-6 flex justify-between items-center">
          <div><p className="font-medium">{s.name}</p><p className="text-xs text-[#5C6680]">{s.email} · {s.role}</p></div>
          <p className="text-sm">{s.booking_count} bookings</p>
        </div>
      ))}
    </div>
  );
}

function AvailabilityTab() {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teachers, setTeachers] = useState([]);
  useEffect(() => { api.get("/admin/teachers").then((r) => setTeachers(r.data)).catch(() => {}); }, []);
  const add = async () => {
    if (!newDate || !newTime) return;
    try { await api.post("/admin/availability", { date: newDate, start_time: newTime, teacher_id: teacherId || null }); toast.success("Added"); setNewTime(""); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="bg-white border border-[#EFE4D0] rounded-2xl p-6 flex flex-wrap items-end gap-3">
      <Field label="Date"><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} data-testid="slot-date" /></Field>
      <Field label="Time"><Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} data-testid="slot-time" /></Field>
      <Field label="Teacher">
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} data-testid="slot-teacher"
          className="h-10 px-3 rounded-md border border-[#EFE4D0] bg-white text-sm min-w-[180px]">
          <option value="">— Any (open) —</option>
          {teachers.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Button onClick={add} data-testid="add-slot-btn" className="bg-[#E8704C] text-white hover:bg-[#C95630]">Add slot</Button>
    </div>
  );
}

// ---------- Users management ----------
function UsersTab() {
  const { user: me } = useApp();
  const [list, setList] = useState([]);
  const roles = ["administrador_sitio", "administrador_profesor", "profesor", "editor_cms", "alumno"];
  const load = async () => { try { setList((await api.get("/admin/users")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);
  const patchUser = async (uid, patch) => { try { await api.patch(`/admin/users/${uid}`, patch); toast.success("Updated"); load(); } catch { toast.error("Failed"); } };
  const remove = async (uid) => {
    if (!window.confirm("Delete user?")) return;
    try { await api.delete(`/admin/users/${uid}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-2xl">Users</h3>
        <span className="text-xs text-[#5C6680]">{list.length} total</span>
      </div>
      <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
        {list.length === 0 && <p className="p-6 text-sm text-[#5C6680]">No users yet.</p>}
        {list.map((u) => (
          <div key={u.user_id} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-1">
              {u.picture ? <img src={u.picture} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                <div className="w-10 h-10 rounded-full bg-[#FFF0E6] flex items-center justify-center font-display text-[#E8704C]">{u.name?.[0] || "?"}</div>}
            </div>
            <div className="md:col-span-5 min-w-0">
              <p className="font-medium truncate">{u.name} {u.user_id === me?.user_id && <span className="text-[10px] text-[#E8704C] ml-1">(you)</span>}</p>
              <p className="text-xs text-[#5C6680] truncate">{u.email}</p>
            </div>
            <div className="md:col-span-2 text-sm text-[#5C6680]">{u.booking_count} bookings</div>
            <div className="md:col-span-2">
              <select value={u.role} onChange={(e) => patchUser(u.user_id, { role: e.target.value })}
                data-testid={`role-${u.user_id}`}
                className="h-9 px-3 rounded-md border border-[#EFE4D0] bg-white text-sm w-full">
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="md:col-span-1"><Switch checked={u.active !== false} onCheckedChange={(v) => patchUser(u.user_id, { active: v })} /></div>
            <div className="md:col-span-1 text-right">
              <Button variant="ghost" size="icon" disabled={u.user_id === me?.user_id} onClick={() => remove(u.user_id)} data-testid={`del-user-${u.user_id}`}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Settings CMS ----------
function SettingsTab() {
  const { refreshSettings } = useApp();
  const [s, setS] = useState(null);
  const load = async () => { try { setS((await api.get("/admin/settings")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);
  if (!s) return <p className="p-6 text-sm text-[#5C6680]">Loading…</p>;

  const setField = (path, val) => {
    setS((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [k, sub] = path.split(".");
        next[k] = { ...(prev[k] || {}), [sub]: val };
      } else next[path] = val;
      return next;
    });
  };
  const save = async (section) => {
    let body = s;
    if (section === "brand") body = { brand_name: s.brand_name, tagline_en: s.tagline_en, tagline_es: s.tagline_es, logo_url: s.logo_url, favicon_url: s.favicon_url, hero_image_url: s.hero_image_url };
    if (section === "stripe") body = { stripe: s.stripe };
    if (section === "gcal") body = { google_calendar: s.google_calendar };
    if (section === "contact") body = { contact_email: s.contact_email, social_instagram: s.social_instagram, social_twitter: s.social_twitter };
    try { await api.patch("/admin/settings", body); toast.success("Saved"); await refreshSettings(); }
    catch { toast.error("Failed"); }
  };

  const card = (title, kids, onSave, testid) => (
    <div className="bg-white border border-[#EFE4D0] rounded-2xl p-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-display text-xl">{title}</h3>
        <Button onClick={onSave} data-testid={testid} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save</Button>
      </div>
      <div className="space-y-4">{kids}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {card("Branding", (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Brand name"><Input value={s.brand_name || ""} onChange={(e) => setField("brand_name", e.target.value)} data-testid="set-brand" /></Field>
          <Field label="Tagline (EN)"><Input value={s.tagline_en || ""} onChange={(e) => setField("tagline_en", e.target.value)} /></Field>
          <Field label="Tagline (ES)"><Input value={s.tagline_es || ""} onChange={(e) => setField("tagline_es", e.target.value)} /></Field>
          <div />
          <div className="col-span-2"><Field label="Logo (overrides MOSAICO wordmark)"><ImageUpload value={s.logo_url} onChange={(v) => setField("logo_url", v)} testid="set-logo" /></Field></div>
          <div className="col-span-2"><Field label="Favicon (32x32 PNG/ICO)"><ImageUpload value={s.favicon_url} onChange={(v) => setField("favicon_url", v)} testid="set-favicon" /></Field></div>
          <div className="col-span-2"><Field label="Hero image (optional)"><ImageUpload value={s.hero_image_url} onChange={(v) => setField("hero_image_url", v)} testid="set-hero" /></Field></div>
        </div>
      ), () => save("brand"), "save-brand")}

      {card((
        <span className="flex items-center gap-2">Stripe payments
          <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${s.stripe?.enabled ? "bg-[#E0F2F0] text-[#2DA89F]" : "bg-[#FFF0E6] text-[#5C6680]"}`}>
            {s.stripe?.enabled ? "Enabled" : "Disabled"}
          </span>
        </span>
      ), (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Enabled"><div className="pt-2"><Switch checked={!!s.stripe?.enabled} onCheckedChange={(v) => setField("stripe.enabled", v)} data-testid="set-stripe-enabled" /></div></Field>
          <Field label="Test mode"><div className="pt-2"><Switch checked={!!s.stripe?.test_mode} onCheckedChange={(v) => setField("stripe.test_mode", v)} /></div></Field>
          <Field label="Publishable key (pk_…)"><Input value={s.stripe?.publishable_key || ""} onChange={(e) => setField("stripe.publishable_key", e.target.value)} placeholder="pk_test_…" /></Field>
          <Field label="Secret key (sk_…)"><Input type="password" value={s.stripe?.secret_key || ""} onChange={(e) => setField("stripe.secret_key", e.target.value)} placeholder="sk_test_… (empty = fallback to env)" data-testid="set-stripe-secret" /></Field>
          <p className="col-span-2 text-xs text-[#5C6680]">
            Leave the secret blank to use STRIPE_API_KEY from the backend environment. Paste a key here only if you want the CMS value to override the environment.
          </p>
        </div>
      ), () => save("stripe"), "save-stripe")}

      {card((
        <span className="flex items-center gap-2">Google Calendar / Meet
          <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${s.google_calendar?.enabled ? "bg-[#E0F2F0] text-[#2DA89F]" : "bg-[#FFF0E6] text-[#5C6680]"}`}>
            {s.google_calendar?.enabled ? "Connected" : "Not connected"}
          </span>
        </span>
      ), (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Enabled"><div className="pt-2"><Switch checked={!!s.google_calendar?.enabled} onCheckedChange={(v) => setField("google_calendar.enabled", v)} data-testid="set-gcal-enabled" /></div></Field>
          <Field label="Auto-create Meet link"><div className="pt-2"><Switch checked={!!s.google_calendar?.auto_create_meet} onCheckedChange={(v) => setField("google_calendar.auto_create_meet", v)} /></div></Field>
          <Field label="OAuth Client ID"><Input value={s.google_calendar?.client_id || ""} onChange={(e) => setField("google_calendar.client_id", e.target.value)} /></Field>
          <Field label="OAuth Client Secret"><Input type="password" value={s.google_calendar?.client_secret || ""} onChange={(e) => setField("google_calendar.client_secret", e.target.value)} /></Field>
          <Field label="Refresh Token"><Input type="password" value={s.google_calendar?.refresh_token || ""} onChange={(e) => setField("google_calendar.refresh_token", e.target.value)} /></Field>
          <Field label="Calendar ID"><Input value={s.google_calendar?.calendar_id || ""} onChange={(e) => setField("google_calendar.calendar_id", e.target.value)} placeholder="primary" /></Field>
          <div className="col-span-2 flex items-center justify-between gap-3 pt-2 border-t border-[#EFE4D0]">
            <p className="text-xs text-[#5C6680]">
              When connected, paid bookings auto-create a Calendar event with a Meet link and email the student.
            </p>
            <Button
              type="button"
              variant="outline"
              data-testid="test-gcal-btn"
              onClick={async () => {
                try {
                  const r = await api.post("/admin/settings/test-gcal");
                  toast.success(r.data.message || "Invite sent");
                } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
              }}
              className="border-[#2DA89F] text-[#2DA89F] hover:bg-[#E0F2F0]"
            >
              Send test invite
            </Button>
          </div>
        </div>
      ), () => save("gcal"), "save-gcal")}

      {card("Contact & social", (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact email"><Input value={s.contact_email || ""} onChange={(e) => setField("contact_email", e.target.value)} /></Field>
          <div />
          <Field label="Instagram URL"><Input value={s.social_instagram || ""} onChange={(e) => setField("social_instagram", e.target.value)} placeholder="https://instagram.com/…" /></Field>
          <Field label="Twitter / X URL"><Input value={s.social_twitter || ""} onChange={(e) => setField("social_twitter", e.target.value)} placeholder="https://x.com/…" /></Field>
        </div>
      ), () => save("contact"), "save-contact")}
    </div>
  );
}

function PagesTab() {
  const empty = { title: "", slug: "", language: "es", status: "draft", meta_title: "", meta_description: "", hero_image: "", content_text: "" };
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const load = async () => { try { setList((await api.get("/admin/pages")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);
  const open = (p) => {
    setEditing(p?.id || "__new");
    setForm(p ? { ...empty, ...p, content_text: (p.content_blocks || []).map((b) => b.body || "").join("\n\n") } : empty);
  };
  const save = async () => {
    const body = { ...form, content_blocks: [{ type: "text", body: form.content_text || "" }] };
    delete body.content_text;
    try {
      if (editing === "__new") await api.post("/admin/pages", body);
      else await api.patch(`/admin/pages/${editing}`, body);
      toast.success("Guardado"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "No se pudo guardar"); }
  };
  const duplicate = async (id) => { try { await api.post(`/admin/pages/${id}/duplicate`); toast.success("Duplicada"); load(); } catch { toast.error("No se pudo duplicar"); } };
  const archive = async (id) => { try { await api.delete(`/admin/pages/${id}`); toast.success("Archivada"); load(); } catch { toast.error("No se pudo archivar"); } };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-2xl">Paginas CMS</h3>
        <Button onClick={() => open(null)} className="rounded-full bg-[#E8704C] text-white hover:bg-[#C95630]"><Plus size={14} className="mr-1" /> Nueva pagina</Button>
      </div>
      <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
        {list.length === 0 && <p className="p-6 text-sm text-[#5C6680]">No hay paginas.</p>}
        {list.map((p) => (
          <div key={p.id} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium flex items-center gap-2"><FileText size={16} /> {p.title}</p>
              <p className="text-xs text-[#5C6680]">/{p.slug} · {p.language} · <Badge tone={p.status === "published" ? "green" : p.status === "draft" ? "orange" : "neutral"}>{p.status}</Badge></p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => duplicate(p.id)}><Copy size={14} /></Button>
              <Button variant="ghost" size="icon" onClick={() => open(p)}><Pencil size={14} /></Button>
              <Button variant="ghost" size="icon" onClick={() => archive(p.id)}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{editing === "__new" ? "Nueva pagina" : "Editar pagina"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
            <Field label="Titulo"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Idioma"><select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full h-10 px-3 rounded-md border border-[#EFE4D0] bg-white text-sm"><option value="es">es</option><option value="en">en</option></select></Field>
            <Field label="Estado"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-[#EFE4D0] bg-white text-sm"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></Field>
            <Field label="Meta title"><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></Field>
            <Field label="Meta description"><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Hero image"><ImageUpload value={form.hero_image} onChange={(v) => setForm({ ...form, hero_image: v })} testid="page-hero" /></Field></div>
            <div className="col-span-2"><Field label="Contenido"><Textarea rows={8} value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaTab() {
  const empty = { file_name: "", url: "", type: "image", alt_text: "" };
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const load = async () => { try { setList((await api.get("/admin/media")).data); } catch { /* */ } };
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (editing === "__new") await api.post("/admin/media", form);
      else await api.patch(`/admin/media/${editing}`, form);
      toast.success("Guardado"); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "No se pudo guardar"); }
  };
  const remove = async (id) => { try { await api.delete(`/admin/media/${id}`); toast.success("Eliminado"); load(); } catch { toast.error("No se pudo eliminar"); } };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-2xl">Biblioteca de medios</h3>
        <Button onClick={() => { setForm(empty); setEditing("__new"); }} className="rounded-full bg-[#E8704C] text-white hover:bg-[#C95630]"><Plus size={14} className="mr-1" /> Agregar URL</Button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {list.map((m) => (
          <div key={m.id} className="bg-white border border-[#EFE4D0] rounded-2xl p-4">
            {m.url ? <img src={m.url} alt={m.alt_text || ""} className="w-full aspect-video object-cover rounded-lg bg-[#FFF0E6]" /> : <div className="aspect-video rounded-lg bg-[#FFF0E6] flex items-center justify-center"><ImageIcon /></div>}
            <p className="mt-3 font-medium truncate">{m.file_name}</p>
            <p className="text-xs text-[#5C6680] truncate">{m.alt_text || "Sin alt text"}</p>
            <div className="mt-3 flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setForm({ ...empty, ...m }); setEditing(m.id); }}><Pencil size={14} /></Button><Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 size={14} className="text-red-500" /></Button></div>
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Medio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="File name"><Input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} /></Field>
            <Field label="URL"><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
            <Field label="Alt text"><Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolesTab() {
  const [roles, setRoles] = useState([]);
  useEffect(() => { api.get("/admin/roles").then((r) => setRoles(r.data)).catch(() => {}); }, []);
  return (
    <div className="bg-white border border-[#EFE4D0] rounded-2xl divide-y divide-[#EFE4D0]">
      {roles.map((r) => (
        <div key={r.name} className="p-5">
          <p className="font-medium flex items-center gap-2"><ShieldCheck size={16} /> {r.name}</p>
          <p className="text-sm text-[#5C6680] mt-1">{r.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">{(r.permissions || []).map((p) => <Badge key={p} tone={p === "*" ? "green" : "blue"}>{p}</Badge>)}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Page ----------
export default function Admin() {
  const { t, user, authLoading } = useApp();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (canAdmin(user) || canCms(user)) api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, [user]);

  if (authLoading) return <div className="px-6 py-20">…</div>;
  if (!user) return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <h1 className="font-display text-3xl">{t.signInToContinue}</h1>
      <Button onClick={startGoogleAuth} className="mt-8 rounded-full bg-[#E8704C] text-white hover:bg-[#C95630]">{t.signInWithGoogle}</Button>
    </div>
  );
  if (!canAdmin(user) && !canCms(user)) return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <h1 className="font-display text-3xl">403</h1>
      <p className="mt-2 text-[#5C6680]">Admin access only.</p>
    </div>
  );

  return (
    <div data-testid="admin-page" className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight">{t.admin.title}</h1>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { k: t.admin.students, v: stats?.students ?? "—" },
          { k: t.admin.bookings, v: stats?.bookings ?? "—" },
          { k: t.admin.upcoming, v: stats?.upcoming ?? "—" },
          { k: t.admin.revenue, v: stats ? `$${stats.revenue_usd.toFixed(0)}` : "—" },
        ].map((s) => (
          <div key={s.k} data-testid={`stat-${s.k}`} className="bg-white border border-[#EFE4D0] rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#5C6680] font-semibold">{s.k}</p>
            <p className="mt-2 font-display text-3xl">{s.v}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue={canAdmin(user) ? "bookings" : "pages"} className="mt-12">
        <TabsList className="bg-[#FFF0E6] flex-wrap h-auto">
          <TabsTrigger value="bookings" data-testid="tab-bookings">{t.admin.allBookings}</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">Roles</TabsTrigger>
          <TabsTrigger value="availability" data-testid="tab-availability">{t.admin.availability}</TabsTrigger>
          <TabsTrigger value="teachers" data-testid="tab-teachers">Teachers</TabsTrigger>
          <TabsTrigger value="classes" data-testid="tab-classes">Classes</TabsTrigger>
          <TabsTrigger value="pages" data-testid="tab-pages">Pages</TabsTrigger>
          <TabsTrigger value="blog" data-testid="tab-blog">Blog</TabsTrigger>
          <TabsTrigger value="media" data-testid="tab-media">Media</TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-6"><BookingsTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="roles" className="mt-6"><RolesTab /></TabsContent>
        <TabsContent value="availability" className="mt-6"><AvailabilityTab /></TabsContent>
        <TabsContent value="teachers" className="mt-6"><TeachersTab /></TabsContent>
        <TabsContent value="classes" className="mt-6"><ProductsTab /></TabsContent>
        <TabsContent value="pages" className="mt-6"><PagesTab /></TabsContent>
        <TabsContent value="blog" className="mt-6"><BlogTab /></TabsContent>
        <TabsContent value="media" className="mt-6"><MediaTab /></TabsContent>
        <TabsContent value="content" className="mt-6"><ContentTab /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
