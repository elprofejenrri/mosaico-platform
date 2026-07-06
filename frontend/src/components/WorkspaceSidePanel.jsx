import React from "react";
import { X } from "lucide-react";

export default function WorkspaceSidePanel({ title, eyebrow, children, onClose, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-[85] bg-[#10213F]/35 p-4 backdrop-blur-sm">
      <div className={`ml-auto flex h-full w-full ${maxWidth} flex-col rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-[#EFE4D0] px-5 py-4">
          <div>
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">{eyebrow}</p>}
            <h2 className="font-display text-2xl text-[#1F3B6E]">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-[#5C6680] hover:bg-[#FFF0E6]"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
