import React, { useRef, useState } from "react";
import { api, API } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

// Resolve possibly-relative URL returned by backend (/api/files/...) to absolute.
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const resolveUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  if (u.startsWith("/api/")) return `${BACKEND}${u}`;
  return u;
};

/**
 * ImageUpload — admin-side upload (POST /api/admin/upload) + URL field combo.
 * Props:
 *   value (string)    current image URL (full or /api/files/...)
 *   onChange(newUrl)  called after upload completes or user edits the field
 *   testid (string)   data-testid prefix
 */
export const ImageUpload = ({ value, onChange, testid = "img" }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const handle = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    const fd = new FormData();
    fd.append("file", f);
    setBusy(true);
    try {
      const r = await api.post("/admin/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(r.data.url);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const display = resolveUrl(value);

  return (
    <div className="flex items-start gap-4">
      {display ? (
        <div className="relative">
          <img src={display} alt="" className="w-20 h-20 rounded-xl object-cover border border-[#EFE4D0]" data-testid={`${testid}-preview`} />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-[#EFE4D0] rounded-full flex items-center justify-center hover:bg-[#FFF0E6]"
            aria-label="Remove image"
            data-testid={`${testid}-remove`}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[#EFE4D0] flex items-center justify-center text-[#5C6680]">
          <Upload size={20} />
        </div>
      )}
      <div className="flex-1 space-y-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload"
          data-testid={`${testid}-url`}
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={pick} disabled={busy} data-testid={`${testid}-btn`}
            className="bg-[#1F3B6E] text-white hover:bg-[#162a4f]">
            <Upload size={14} className="mr-1" /> {busy ? "Uploading…" : "Upload"}
          </Button>
          <span className="text-xs text-[#5C6680]">JPG / PNG / WEBP · max 5 MB</span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handle} className="hidden" data-testid={`${testid}-input`} />
      </div>
    </div>
  );
};
