import React, { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { BookOpen, ChevronDown, FileText, History, Lock, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { useApp } from "../context/AppContext";
import { isTechnicalUser } from "../lib/access";
import { productionReleases } from "../data/productionReleases";
import { technicalWikiPrinciples, technicalWikiSections } from "../data/technicalWiki";
import { api } from "../lib/api";

const wikiTabs = [
  { id: "overview", label: "Overview" },
  { id: "reader", label: "Document reader" },
  { id: "releases", label: "Releases" },
  { id: "documents", label: "Documents" },
];

const releaseRules = [
  "Update the Markdown and in-app histories in the same change set.",
  "Keep unique versions in descending order, with the newest first.",
  "Update focused documentation whenever a release changes behavior.",
  "Describe observable outcomes only; keep sensitive implementation detail out of visible notes.",
];

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
      blocks.push(<h1 key={index} className="break-words font-display text-3xl text-[#1F3B6E]">{line.replace(/^# /, "")}</h1>);
      return;
    }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={index} className="mt-4 break-words font-display text-2xl text-[#1F3B6E]">{line.replace(/^## /, "")}</h2>);
      return;
    }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={index} className="mt-3 break-words text-lg font-semibold text-[#1F3B6E]">{line.replace(/^### /, "")}</h3>);
      return;
    }
    if (line.startsWith("- ")) {
      blocks.push(<p key={index} className="break-words pl-4 text-sm text-[#5C6680]">- {line.replace(/^- /, "")}</p>);
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push(<p key={index} className="break-words pl-4 text-sm text-[#5C6680]">{line}</p>);
      return;
    }
    blocks.push(<p key={index} className="break-words text-sm leading-6 text-[#5C6680]">{line}</p>);
  });

  return <div className="grid gap-2">{blocks}</div>;
}

function ReleaseHistory() {
  return (
    <section aria-labelledby="production-history-heading" className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-[#EFE4D0] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">
            <History size={16} aria-hidden="true" /> {productionReleases.length} {productionReleases.length === 1 ? "release" : "releases"}
          </p>
          <h2 id="production-history-heading" className="mt-2 break-words font-display text-3xl text-[#1F3B6E]">Production history</h2>
          <p className="mt-2 break-words text-sm text-[#5C6680]">
            Synchronized with the restricted Technical Wiki Markdown source of truth.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-md bg-[#E0F2F0] px-3 py-1 text-sm font-semibold text-[#2DA89F]">
          Newest first
        </span>
      </div>

      <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto overscroll-contain pr-1" aria-label="Production release entries">
        {productionReleases.map((release, index) => (
          <details
            key={release.version}
            open={index === 0}
            className="group overflow-hidden rounded-lg border border-[#EFE4D0] bg-[#FBF7EE]"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-lg p-4 outline-none focus-visible:ring-2 focus-visible:ring-[#E8704C] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block break-all text-xs font-semibold uppercase tracking-[0.16em] text-[#E8704C]">
                  Version {release.version}
                </span>
                <span className="mt-1 block break-words text-lg font-semibold text-[#1F3B6E]">{release.title}</span>
                <span className="mt-2 block break-words text-sm leading-6 text-[#5C6680]">{release.summary}</span>
              </span>
              <ChevronDown className="mt-1 shrink-0 text-[#1F3B6E] transition-transform group-open:rotate-180" size={20} aria-hidden="true" />
            </summary>
            <div className="border-t border-[#EFE4D0] bg-white px-4 py-4">
              <h3 className="text-sm font-semibold text-[#1F3B6E]">Release outcomes</h3>
              <ul className="mt-3 grid gap-3">
                {release.items.map((item) => (
                  <li key={item} className="flex min-w-0 gap-3 text-sm leading-6 text-[#5C6680]">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2DA89F]" aria-hidden="true" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function TechnicalWiki() {
  const { user, authLoading } = useApp();
  const firstDoc = technicalWikiSections[0].docs[0];
  const [selectedDoc, setSelectedDoc] = useState(firstDoc);
  const [docContent, setDocContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const tabRefs = useRef([]);
  const allDocs = useMemo(() => technicalWikiSections.flatMap((section) => section.docs), []);

  const loadDoc = async (doc) => {
    setSelectedDoc(doc);
    setActiveTab("reader");
    setDocLoading(true);
    setDocError("");
    try {
      const { data } = await api.get(`/technical/docs/${doc.id}`);
      setDocContent(data.content || "");
    } catch (error) {
      setDocError(error.response?.data?.message || error.response?.data?.detail || "Could not load this document.");
      setDocContent("");
    } finally {
      setDocLoading(false);
    }
  };

  const selectTab = (index) => {
    const normalized = (index + wikiTabs.length) % wikiTabs.length;
    setActiveTab(wikiTabs[normalized].id);
    tabRefs.current[normalized]?.focus();
  };

  const handleTabKeyDown = (event, index) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(wikiTabs.length - 1);
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
    <div className="min-w-0 bg-[#FBF7EE]">
      <section className="border-b border-[#EFE4D0] bg-[#1F3B6E] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#F4C13D]">
            <ShieldCheck size={16} aria-hidden="true" /> Restricted technical documentation
          </p>
          <h1 className="mt-3 break-words font-display text-4xl">MOSAICO Platform Wiki</h1>
          <p className="mt-3 max-w-3xl text-white/80">
            Review platform documentation and safe production outcomes inside MOSAICO.
          </p>
        </div>
      </section>

      <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="overflow-x-auto pb-1">
          <div
            role="tablist"
            aria-label="Technical wiki sections"
            className="flex min-w-max gap-2 rounded-lg border border-[#EFE4D0] bg-white p-2 shadow-sm"
          >
            {wikiTabs.map((tab, index) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(node) => { tabRefs.current[index] = node; }}
                  id={`wiki-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`wiki-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#E8704C] focus-visible:ring-offset-2 ${
                    selected ? "bg-[#1F3B6E] text-white" : "text-[#5C6680] hover:bg-[#FFF0E6] hover:text-[#1F3B6E]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section
          id="wiki-panel-overview"
          role="tabpanel"
          aria-labelledby="wiki-tab-overview"
          hidden={activeTab !== "overview"}
          tabIndex={0}
          className="mt-6 outline-none focus-visible:ring-2 focus-visible:ring-[#E8704C]"
        >
          <div className="rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl text-[#1F3B6E]">Working rules</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {technicalWikiPrinciples.map((principle) => (
                <div key={principle} className="flex min-w-0 gap-3 rounded-lg bg-[#FBF7EE] p-4">
                  <BookOpen size={18} className="mt-0.5 shrink-0 text-[#2DA89F]" aria-hidden="true" />
                  <p className="min-w-0 break-words text-sm text-[#5C6680]">{principle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="wiki-panel-reader"
          role="tabpanel"
          aria-labelledby="wiki-tab-reader"
          hidden={activeTab !== "reader"}
          tabIndex={0}
          className="mt-6 outline-none focus-visible:ring-2 focus-visible:ring-[#E8704C]"
        >
          <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Internal reader</p>
                <h2 className="mt-1 break-words font-display text-2xl text-[#1F3B6E]">{selectedDoc.title}</h2>
                <p className="mt-1 break-all text-sm text-[#5C6680]">{selectedDoc.path}</p>
              </div>
              <select
                aria-label="Select technical document"
                value={selectedDoc.id}
                onChange={(event) => {
                  const doc = allDocs.find((item) => item.id === event.target.value);
                  if (doc) loadDoc(doc);
                }}
                className="h-10 max-w-full rounded-md border border-[#EFE4D0] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"
              >
                {allDocs.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
              </select>
            </div>
            <div className="mt-5 min-h-[320px] min-w-0 rounded-lg bg-[#FBF7EE] p-4 sm:p-5">
              {!docContent && !docLoading && !docError && (
                <div className="grid min-h-[260px] place-items-center text-center">
                  <div>
                    <BookOpen className="mx-auto text-[#2DA89F]" size={32} aria-hidden="true" />
                    <p className="mt-3 font-semibold text-[#1F3B6E]">Choose a document to read it here.</p>
                    <Button onClick={() => loadDoc(selectedDoc)} className="mt-4 bg-[#E8704C] text-white hover:bg-[#C95630]">Load selected document</Button>
                  </div>
                </div>
              )}
              {docLoading && <p className="text-sm text-[#5C6680]">Loading document...</p>}
              {docError && <p role="alert" className="text-sm text-[#E8704C]">{docError}</p>}
              {docContent && !docLoading && <MarkdownViewer content={docContent} />}
            </div>
          </div>
        </section>

        <section
          id="wiki-panel-releases"
          role="tabpanel"
          aria-labelledby="wiki-tab-releases"
          hidden={activeTab !== "releases"}
          tabIndex={0}
          className="mt-6 grid gap-6 outline-none focus-visible:ring-2 focus-visible:ring-[#E8704C]"
        >
          <div className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-display text-2xl text-[#1F3B6E]">Release documentation rules</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {releaseRules.map((rule) => (
                <li key={rule} className="flex min-w-0 gap-3 rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#2DA89F]" aria-hidden="true" />
                  <span className="min-w-0 break-words">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <ReleaseHistory />
        </section>

        <section
          id="wiki-panel-documents"
          role="tabpanel"
          aria-labelledby="wiki-tab-documents"
          hidden={activeTab !== "documents"}
          tabIndex={0}
          className="mt-6 grid gap-6 outline-none focus-visible:ring-2 focus-visible:ring-[#E8704C]"
        >
          {technicalWikiSections.map((section) => (
            <section key={section.id} className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div className="min-w-0">
                  <h2 className="break-words font-display text-2xl text-[#1F3B6E]">{section.title}</h2>
                  <p className="mt-1 break-words text-sm text-[#5C6680]">{section.summary}</p>
                </div>
                <span className="w-fit shrink-0 rounded-md bg-[#E0F2F0] px-3 py-1 text-sm text-[#2DA89F]">{section.docs.length} docs</span>
              </div>
              <div className="mt-5 grid gap-3">
                {section.docs.map((doc) => (
                  <div key={doc.path} className="grid min-w-0 gap-3 rounded-lg border border-[#EFE4D0] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="flex min-w-0 gap-3">
                      <FileText size={18} className="mt-1 shrink-0 text-[#E8704C]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-[#1F3B6E]">{doc.title}</p>
                        <p className="mt-1 break-all text-sm text-[#5C6680]">{doc.path}</p>
                        <p className="mt-1 break-words text-xs uppercase tracking-[0.14em] text-[#5C6680]">{doc.owner} - {doc.status}</p>
                      </div>
                    </div>
                    <Button onClick={() => loadDoc(doc)} variant="outline" className="border-[#EFE4D0] text-[#E8704C] hover:bg-[#FFF0E6]">Read</Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </section>
      </main>
    </div>
  );
}
