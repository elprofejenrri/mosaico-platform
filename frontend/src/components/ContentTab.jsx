import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const F = ({ label, children }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-[0.18em] text-[#5C6680] font-semibold">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const Section = ({ title, hint, defaultOpen, children, onSave, testid }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-white border border-[#EFE4D0] rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full p-5 flex items-center justify-between hover:bg-[#FBF7EE]" data-testid={`${testid}-toggle`}>
        <div className="flex items-center gap-2 text-left">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-display text-xl">{title}</span>
          {hint && <span className="text-xs text-[#5C6680] ml-2">— {hint}</span>}
        </div>
        {open && (
          <Button type="button" onClick={(e) => { e.stopPropagation(); onSave(); }}
            className="bg-[#E8704C] text-white hover:bg-[#C95630]" data-testid={testid}>Save</Button>
        )}
      </button>
      {open && <div className="p-5 border-t border-[#EFE4D0] space-y-4">{children}</div>}
    </div>
  );
};

export function ContentTab() {
  const { refreshSettings } = useApp();
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data)).catch(() => {}); }, []);
  if (!s) return <p className="p-6 text-sm text-[#5C6680]">Loading…</p>;

  const c = s.content || {};
  const setContent = (path, val) => {
    setS((prev) => {
      const next = { ...prev, content: { ...(prev.content || {}) } };
      if (!path.includes(".")) { next.content[path] = val; return next; }
      const [section, key] = path.split(".");
      next.content[section] = { ...(next.content[section] || {}), [key]: val };
      return next;
    });
  };

  const saveSection = async (section, value) => {
    try {
      await api.patch("/admin/settings", { content: { [section]: value } });
      toast.success("Saved");
      await refreshSettings();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const hero = c.hero || {};
  const about = c.about || {};
  const footer = c.footer || {};
  const audiences = c.audiences || [];
  const testimonials = c.testimonials || [];
  const faq = c.faq || [];

  const setArrayItem = (key, idx, field, val) => {
    setS((prev) => {
      const arr = [...((prev.content || {})[key] || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...prev, content: { ...(prev.content || {}), [key]: arr } };
    });
  };
  const addArrayItem = (key, blank) => {
    setS((prev) => {
      const arr = [...((prev.content || {})[key] || []), blank];
      return { ...prev, content: { ...(prev.content || {}), [key]: arr } };
    });
  };
  const removeArrayItem = (key, idx) => {
    setS((prev) => {
      const arr = [...((prev.content || {})[key] || [])];
      arr.splice(idx, 1);
      return { ...prev, content: { ...(prev.content || {}), [key]: arr } };
    });
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Section title="Hero" hint="The chip + subtitle + CTAs above the fold (the big title stays styled by code)"
        defaultOpen onSave={() => saveSection("hero", hero)} testid="save-hero">
        <div className="grid grid-cols-2 gap-4">
          <F label="Tag chip (EN)"><Input value={hero.tag_en || ""} onChange={(e) => setContent("hero.tag_en", e.target.value)} placeholder="Classes for kids, teens & adults" /></F>
          <F label="Tag chip (ES)"><Input value={hero.tag_es || ""} onChange={(e) => setContent("hero.tag_es", e.target.value)} placeholder="Clases para niños, adolescentes y adultos" /></F>
          <F label="Speech bubble (EN)"><Input value={hero.bubble_en || ""} onChange={(e) => setContent("hero.bubble_en", e.target.value)} placeholder="¡Hablemos español!" /></F>
          <F label="Speech bubble (ES)"><Input value={hero.bubble_es || ""} onChange={(e) => setContent("hero.bubble_es", e.target.value)} placeholder="¡Hablemos español!" /></F>
          <div className="col-span-2"><F label="Subtitle (EN)"><Textarea rows={2} value={hero.subtitle_en || ""} onChange={(e) => setContent("hero.subtitle_en", e.target.value)} /></F></div>
          <div className="col-span-2"><F label="Subtitle (ES)"><Textarea rows={2} value={hero.subtitle_es || ""} onChange={(e) => setContent("hero.subtitle_es", e.target.value)} /></F></div>
          <F label="CTA primary (EN)"><Input value={hero.cta_primary_en || ""} onChange={(e) => setContent("hero.cta_primary_en", e.target.value)} placeholder="Book a trial class" /></F>
          <F label="CTA primary (ES)"><Input value={hero.cta_primary_es || ""} onChange={(e) => setContent("hero.cta_primary_es", e.target.value)} placeholder="Reservar clase de prueba" /></F>
          <F label="CTA secondary (EN)"><Input value={hero.cta_secondary_en || ""} onChange={(e) => setContent("hero.cta_secondary_en", e.target.value)} placeholder="See pricing" /></F>
          <F label="CTA secondary (ES)"><Input value={hero.cta_secondary_es || ""} onChange={(e) => setContent("hero.cta_secondary_es", e.target.value)} placeholder="Ver precios" /></F>
        </div>
      </Section>

      {/* AUDIENCES */}
      <Section title="Audience cards" hint={`${audiences.length} cards (leave empty to use defaults)`}
        onSave={() => saveSection("audiences", audiences)} testid="save-audiences">
        {audiences.length === 0 && <p className="text-sm text-[#5C6680]">Using built-in defaults (Kids · Teens · Adults). Add a card to override.</p>}
        {audiences.map((a, i) => (
          <div key={i} className="border border-[#EFE4D0] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5C6680] font-semibold">Card {i + 1}</p>
              <Button variant="ghost" size="icon" onClick={() => removeArrayItem("audiences", i)} data-testid={`audience-del-${i}`}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <F label="Title (EN)"><Input value={a.title_en || ""} onChange={(e) => setArrayItem("audiences", i, "title_en", e.target.value)} /></F>
              <F label="Title (ES)"><Input value={a.title_es || ""} onChange={(e) => setArrayItem("audiences", i, "title_es", e.target.value)} /></F>
              <F label="Color (hex)"><Input value={a.color || ""} onChange={(e) => setArrayItem("audiences", i, "color", e.target.value)} placeholder="#F4C13D" /></F>
            </div>
            <F label="Body (EN)"><Textarea rows={2} value={a.body_en || ""} onChange={(e) => setArrayItem("audiences", i, "body_en", e.target.value)} /></F>
            <F label="Body (ES)"><Textarea rows={2} value={a.body_es || ""} onChange={(e) => setArrayItem("audiences", i, "body_es", e.target.value)} /></F>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => addArrayItem("audiences", { title_en: "", title_es: "", body_en: "", body_es: "", color: "#F4C13D" })}
          data-testid="audience-add" className="border-[#E8704C] text-[#E8704C] hover:bg-[#FFF0E6]">
          <Plus size={14} className="mr-1" /> Add card
        </Button>
      </Section>

      {/* TESTIMONIALS */}
      <Section title="Testimonials" hint={`${testimonials.length} quotes`}
        onSave={() => saveSection("testimonials", testimonials)} testid="save-testimonials">
        {testimonials.length === 0 && <p className="text-sm text-[#5C6680]">Using built-in defaults. Add a quote to override.</p>}
        {testimonials.map((it, i) => (
          <div key={i} className="border border-[#EFE4D0] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5C6680] font-semibold">Quote {i + 1}</p>
              <Button variant="ghost" size="icon" onClick={() => removeArrayItem("testimonials", i)} data-testid={`testimonial-del-${i}`}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
            <F label="Quote (EN)"><Textarea rows={2} value={it.quote_en || ""} onChange={(e) => setArrayItem("testimonials", i, "quote_en", e.target.value)} /></F>
            <F label="Quote (ES)"><Textarea rows={2} value={it.quote_es || ""} onChange={(e) => setArrayItem("testimonials", i, "quote_es", e.target.value)} /></F>
            <F label="Author (shown as-is, e.g. '— Marcus, Berlin · adult')"><Input value={it.author || ""} onChange={(e) => setArrayItem("testimonials", i, "author", e.target.value)} /></F>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => addArrayItem("testimonials", { quote_en: "", quote_es: "", author: "" })}
          data-testid="testimonial-add" className="border-[#E8704C] text-[#E8704C] hover:bg-[#FFF0E6]">
          <Plus size={14} className="mr-1" /> Add quote
        </Button>
      </Section>

      {/* FAQ */}
      <Section title="FAQ" hint={`${faq.length} questions`}
        onSave={() => saveSection("faq", faq)} testid="save-faq">
        {faq.length === 0 && <p className="text-sm text-[#5C6680]">Using built-in defaults. Add a Q&A to override.</p>}
        {faq.map((it, i) => (
          <div key={i} className="border border-[#EFE4D0] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5C6680] font-semibold">Q&A {i + 1}</p>
              <Button variant="ghost" size="icon" onClick={() => removeArrayItem("faq", i)} data-testid={`faq-del-${i}`}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Question (EN)"><Input value={it.q_en || ""} onChange={(e) => setArrayItem("faq", i, "q_en", e.target.value)} /></F>
              <F label="Question (ES)"><Input value={it.q_es || ""} onChange={(e) => setArrayItem("faq", i, "q_es", e.target.value)} /></F>
            </div>
            <F label="Answer (EN)"><Textarea rows={2} value={it.a_en || ""} onChange={(e) => setArrayItem("faq", i, "a_en", e.target.value)} /></F>
            <F label="Answer (ES)"><Textarea rows={2} value={it.a_es || ""} onChange={(e) => setArrayItem("faq", i, "a_es", e.target.value)} /></F>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => addArrayItem("faq", { q_en: "", q_es: "", a_en: "", a_es: "" })}
          data-testid="faq-add" className="border-[#E8704C] text-[#E8704C] hover:bg-[#FFF0E6]">
          <Plus size={14} className="mr-1" /> Add Q&A
        </Button>
      </Section>

      {/* ABOUT */}
      <Section title="About section" hint="Bio + stats below the teachers grid"
        onSave={() => saveSection("about", about)} testid="save-about">
        <div className="grid grid-cols-2 gap-4">
          <F label="Eyebrow (EN)"><Input value={about.eyebrow_en || ""} onChange={(e) => setContent("about.eyebrow_en", e.target.value)} placeholder="About MOSAICO" /></F>
          <F label="Eyebrow (ES)"><Input value={about.eyebrow_es || ""} onChange={(e) => setContent("about.eyebrow_es", e.target.value)} placeholder="Sobre MOSAICO" /></F>
          <F label="Title (EN)"><Input value={about.title_en || ""} onChange={(e) => setContent("about.title_en", e.target.value)} /></F>
          <F label="Title (ES)"><Input value={about.title_es || ""} onChange={(e) => setContent("about.title_es", e.target.value)} /></F>
          <div className="col-span-2"><F label="Body (EN)"><Textarea rows={4} value={about.body_en || ""} onChange={(e) => setContent("about.body_en", e.target.value)} /></F></div>
          <div className="col-span-2"><F label="Body (ES)"><Textarea rows={4} value={about.body_es || ""} onChange={(e) => setContent("about.body_es", e.target.value)} /></F></div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#5C6680] font-semibold mb-2">Stats ({(about.stats || []).length})</p>
          {(about.stats || []).map((st, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-2"><F label="Value"><Input value={st.value || ""} onChange={(e) => setArrayItem("about", "stats", "value", e.target.value)} placeholder="700+" /></F></div>
              <div className="col-span-4"><F label="Label (EN)"><Input value={st.label_en || ""} onChange={(e) => {
                const stats = [...(about.stats || [])]; stats[i] = { ...stats[i], label_en: e.target.value };
                setContent("about.stats", stats);
              }} placeholder="Students" /></F></div>
              <div className="col-span-4"><F label="Label (ES)"><Input value={st.label_es || ""} onChange={(e) => {
                const stats = [...(about.stats || [])]; stats[i] = { ...stats[i], label_es: e.target.value };
                setContent("about.stats", stats);
              }} placeholder="Estudiantes" /></F></div>
              <div className="col-span-1"><F label="Color"><Input value={st.color || ""} onChange={(e) => {
                const stats = [...(about.stats || [])]; stats[i] = { ...stats[i], color: e.target.value };
                setContent("about.stats", stats);
              }} placeholder="#E8704C" /></F></div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" onClick={() => { const stats = [...(about.stats || [])]; stats.splice(i, 1); setContent("about.stats", stats); }}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setContent("about.stats", [...(about.stats || []), { value: "", label_en: "", label_es: "", color: "#E8704C" }])}
            className="border-[#E8704C] text-[#E8704C] hover:bg-[#FFF0E6]">
            <Plus size={14} className="mr-1" /> Add stat
          </Button>
        </div>
      </Section>

      {/* FOOTER */}
      <Section title="Footer chips" hint="The small line under the brand in the footer"
        onSave={() => saveSection("footer", footer)} testid="save-footer">
        <div className="grid grid-cols-2 gap-4">
          <F label="Chips (EN)"><Input value={footer.chips_en || ""} onChange={(e) => setContent("footer.chips_en", e.target.value)} placeholder="Online · Flexible · Personalized" /></F>
          <F label="Chips (ES)"><Input value={footer.chips_es || ""} onChange={(e) => setContent("footer.chips_es", e.target.value)} placeholder="En línea · Flexible · Personalizado" /></F>
        </div>
      </Section>
    </div>
  );
}
