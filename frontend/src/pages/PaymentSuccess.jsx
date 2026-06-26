import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { t, lang } = useApp();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    const poll = async () => {
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        if (r.data.payment_status === "paid") { setStatus("paid"); return; }
        if (r.data.status === "expired") { setStatus("expired"); return; }
      } catch {}
      if (++attempts < 6) setTimeout(poll, 2000);
      else setStatus("timeout");
    };
    poll();
  }, [sessionId]);

  return (
    <div data-testid="payment-success" className="max-w-xl mx-auto px-6 py-24 text-center">
      {status === "paid" && (
        <>
          <CheckCircle2 size={56} className="mx-auto text-[#FFC93C]" />
          <h1 className="mt-6 font-display text-4xl">{lang === "en" ? "You're booked." : "¡Reservado!"}</h1>
          <p className="mt-4 text-[#5C6680]">
            {lang === "en"
              ? "Check your inbox — Google Calendar just emailed you the invite with your Meet link. You'll also find this class in your dashboard."
              : "Revisa tu correo — Google Calendar te envió la invitación con el enlace de Meet. También encontrarás esta clase en tu panel."}
          </p>
          <Link to="/dashboard"><Button className="mt-8 rounded-full bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630] px-7 py-6">{t.nav.dashboard}</Button></Link>
        </>
      )}
      {status === "checking" && <p className="text-[#5C6680]">{lang === "en" ? "Confirming your payment…" : "Confirmando tu pago…"}</p>}
      {status === "expired" && <p className="text-[#E8704C]">{lang === "en" ? "Session expired." : "Sesión expirada."}</p>}
      {status === "timeout" && <p className="text-[#5C6680]">{lang === "en" ? "Still processing. Check your dashboard in a minute." : "Aún procesando. Revisa tu panel en un minuto."}</p>}
    </div>
  );
}
