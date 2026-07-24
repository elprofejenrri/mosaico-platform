import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { api } from "../lib/api";
import { startGoogleAuth, useApp } from "../context/AppContext";

export default function Login() {
  const navigate = useNavigate();
  const { checkAuth } = useApp();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", profile_type: "client" });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const finishAuth = async (data) => {
    localStorage.setItem("mosaico_local_token", data.access_token);
    localStorage.setItem("mosaico_local_expires_at", data.expires_at);
    await checkAuth();
    const access = await api.get("/auth/me/permissions");
    const roles = new Set(access.data?.roles || []);
    const destination = roles.has("administrador_sitio") ? "/admin"
      : roles.has("finanzas") ? "/finance"
      : roles.has("administrador_escolar") ? "/school-admin"
      : roles.has("profesor") ? "/teacher"
      : roles.has("tutor_padre") ? "/tutor"
      : "/student";
    navigate(destination, { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const { data } = await api.post(endpoint, payload);
      await finishAuth(data);
      toast.success(mode === "login" ? "Welcome back." : "Your account is ready.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FBF7EE]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-16">
        <section className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E8704C]">Secure access</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-[#1F3B6E] md:text-5xl">Sign in to your MOSAICO learning account</h1>
          <p className="mt-4 max-w-xl text-base text-[#5C6680]">
            Continue with Google or use your email account to return to your roadmap, classes, credits, and progress.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[#5C6680]">
            <div className="flex items-center gap-3"><Lock size={18} className="text-[#2DA89F]" />Your session stays active between visits.</div>
            <div className="flex items-center gap-3"><UserRound size={18} className="text-[#2DA89F]" />Your profile is connected to the right learning access.</div>
          </div>
        </section>

        <section className="rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm md:p-7">
          <Button onClick={startGoogleAuth} className="h-11 w-full bg-[#1F3B6E] text-white hover:bg-[#162B52]">
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[#5C6680]">
            <span className="h-px flex-1 bg-[#EFE4D0]" />
            or use email
            <span className="h-px flex-1 bg-[#EFE4D0]" />
          </div>

          <div className="grid grid-cols-2 rounded-md border border-[#EFE4D0] p-1">
            <button type="button" onClick={() => setMode("login")} className={`rounded px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-[#FFF0E6] text-[#E8704C]" : "text-[#5C6680]"}`}>Log in</button>
            <button type="button" onClick={() => setMode("register")} className={`rounded px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-[#FFF0E6] text-[#E8704C]" : "text-[#5C6680]"}`}>Create account</button>
          </div>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-2" autoComplete="name" required />
                </div>
                <div>
                  <Label htmlFor="profile_type">Profile</Label>
                  <select id="profile_type" value={form.profile_type} onChange={(event) => update("profile_type", event.target.value)} className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring">
                    <option value="client">Client learner</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="tutor">Tutor / guardian</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-2">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6680]" />
                <Input id="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="pl-9" autoComplete="email" required />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-2">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6680]" />
                <Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} className="pl-9 pr-10" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6680]" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button disabled={loading} className="h-11 bg-[#E8704C] text-white hover:bg-[#C95630]">
              {loading ? "Working..." : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
