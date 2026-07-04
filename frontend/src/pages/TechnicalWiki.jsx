import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BookOpen, FileText, Lock, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { useApp } from "../context/AppContext";
import { isTechnicalUser } from "../lib/access";
import { technicalWikiPrinciples, technicalWikiSections } from "../data/technicalWiki";
import { api } from "../lib/api";

function MarkdownViewer({ content }) {
  const lines = content.split("\n");
  let inCode = false;
  let code = [];
  const blocks = [];

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(<pre key={`code-${index}`} className="overflow-x-auto rounded-md bg-[#10213F] p-4 text-sm text-white"><code>{code.join("\n")}</code></pre>);
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    if (!line.trim()) {
      blocks.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }
    if (line.startsWith("# ")) {
      blocks.push(<h1 key={index} className="font-display text-3xl text-[#1F3B6E]">{line.replace(/^# /, "")}</h1>);
      return;
    }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={index} className="mt-4 font-display text-2xl text-[#1F3B6E]">{line.replace(/^## /, "")}</h2>);
      return;
    }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={index} className="mt-3 text-lg font-semibold text-[#1F3B6E]">{line.replace(/^### /, "")}</h3>);
      return;
    }
    if (line.startsWith("- ")) {
      blocks.push(<p key={index} className="pl-4 text-sm text-[#5C6680]">- {line.replace(/^- /, "")}</p>);
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push(<p key={index} className="pl-4 text-sm text-[#5C6680]">{line}</p>);
      return;
    }
    blocks.push(<p key={index} className="text-sm leading-6 text-[#5C6680]">{line}</p>);
  });

  return <div className="grid gap-2">{blocks}</div>;
}

export default function TechnicalWiki() {
  const { user, authLoading } = useApp();
  const firstDoc = technicalWikiSections[0].docs[0];
  const [selectedDoc, setSelectedDoc] = useState(firstDoc);
  const [docContent, setDocContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const allDocs = useMemo(() => technicalWikiSections.flatMap((section) => section.docs), []);

  const loadDoc = async (doc) => {
    setSelectedDoc(doc);
    setDocLoading(true);
    setDocError("");
    try {
      const { data } = await api.get(`/technical/docs/${doc.id}`);
      setDocContent(data.content || "");
    } catch (error) {
      setDocError(error.response?.data?.detail || "Could not load this document.");
      setDocContent("");
    } finally {
      setDocLoading(false);
    }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-[#5C6680]">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isTechnicalUser(user)) {
    return (
      <div className="mx-auto grid min-h-[55vh] max-w-3xl place-items-center px-6 py-16 text-center">
        <div>
          <Lock className="mx-auto text-[#E8704C]" size={36} />
          <h1 className="mt-4 font-display text-3xl text-[#1F3B6E]">Technical wiki access required</h1>
          <p className="mt-3 text-[#5C6680]">This area is reserved for technical platform roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF7EE]">
      <section className="border-b border-[#EFE4D0] bg-[#1F3B6E] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#F4C13D]">
                <ShieldCheck size={16} /> Technical role only
              </p>
              <h1 className="mt-3 font-display text-4xl">MOSAICO Platform Wiki</h1>
              <p className="mt-3 max-w-3xl text-white/80">
                Read engineering, database, deployment, and platform governance documentation directly inside MOSAICO.
              </p>
            </div>
            <Button asChild className="w-fit bg-[#F4C13D] text-[#1F3B6E] hover:bg-[#FFD75E]">
              <a href="#reader">Open reader</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <aside className="h-fit rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C6680]">Navigate</p>
          <nav className="mt-4 grid gap-2">
            {technicalWikiSections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="rounded-md px-3 py-2 text-sm text-[#1F3B6E] hover:bg-[#FFF0E6]">
                {section.title}
              </a>
            ))}
            <a href="#reader" className="rounded-md px-3 py-2 text-sm font-semibold text-[#E8704C] hover:bg-[#FFF0E6]">Document reader</a>
          </nav>
        </aside>

        <main className="grid gap-6">
          <section id="reader" className="scroll-mt-24 rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Internal reader</p>
                <h2 className="mt-1 font-display text-2xl text-[#1F3B6E]">{selectedDoc.title}</h2>
                <p className="mt-1 text-sm text-[#5C6680]">{selectedDoc.path}</p>
              </div>
              <select
                value={selectedDoc.id}
                onChange={(event) => {
                  const doc = allDocs.find((item) => item.id === event.target.value);
                  if (doc) loadDoc(doc);
                }}
                className="h-10 rounded-md border border-[#EFE4D0] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"
              >
                {allDocs.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
              </select>
            </div>
            <div className="mt-5 min-h-[320px] rounded-lg bg-[#FBF7EE] p-5">
              {!docContent && !docLoading && !docError && (
                <div className="grid min-h-[260px] place-items-center text-center">
                  <div>
                    <BookOpen className="mx-auto text-[#2DA89F]" size={32} />
                    <p className="mt-3 font-semibold text-[#1F3B6E]">Choose a document to read it here.</p>
                    <Button onClick={() => loadDoc(selectedDoc)} className="mt-4 bg-[#E8704C] text-white hover:bg-[#C95630]">Load selected document</Button>
                  </div>
                </div>
              )}
              {docLoading && <p className="text-sm text-[#5C6680]">Loading document...</p>}
              {docError && <p className="text-sm text-[#E8704C]">{docError}</p>}
              {docContent && !docLoading && <MarkdownViewer content={docContent} />}
            </div>
          </section>

          <section className="rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl text-[#1F3B6E]">Working Rules</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {technicalWikiPrinciples.map((principle) => (
                <div key={principle} className="flex gap-3 rounded-lg bg-[#FBF7EE] p-4">
                  <BookOpen size={18} className="mt-0.5 shrink-0 text-[#2DA89F]" />
                  <p className="text-sm text-[#5C6680]">{principle}</p>
                </div>
              ))}
            </div>
          </section>

          {technicalWikiSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h2 className="font-display text-2xl text-[#1F3B6E]">{section.title}</h2>
                  <p className="mt-1 text-sm text-[#5C6680]">{section.summary}</p>
                </div>
                <span className="w-fit rounded-md bg-[#E0F2F0] px-3 py-1 text-sm text-[#2DA89F]">{section.docs.length} docs</span>
              </div>
              <div className="mt-5 grid gap-3">
                {section.docs.map((doc) => (
                  <div key={doc.path} className="grid gap-3 rounded-lg border border-[#EFE4D0] p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex gap-3">
                      <FileText size={18} className="mt-1 shrink-0 text-[#E8704C]" />
                      <div>
                        <p className="font-semibold text-[#1F3B6E]">{doc.title}</p>
                        <p className="mt-1 text-sm text-[#5C6680]">{doc.path}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#5C6680]">{doc.owner} - {doc.status}</p>
                      </div>
                    </div>
                    <Button onClick={() => loadDoc(doc)} variant="outline" className="border-[#EFE4D0] text-[#E8704C] hover:bg-[#FFF0E6]">Read</Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
