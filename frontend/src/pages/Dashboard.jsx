import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp, startGoogleAuth } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Calendar as CalIcon, Clock, Video } from "lucide-react";

export default function Dashboard() {
  const { t, user, authLoading, lang } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get("/bookings/me").then((r) => setBookings(r.data)).finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="max-w-7xl mx-auto px-6 py-20">…</div>;

  if (!user) {
    return (
      <div data-testid="dashboard-signin" className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl">{t.signInToContinue}</h1>
        <Button onClick={startGoogleAuth} data-testid="dashboard-signin-btn" className="mt-8 rounded-full bg-[#E8704C] text-[#FBF7EE] hover:bg-[#C95630] hover:text-[#FBF7EE] px-7 py-6">
          {t.signInWithGoogle}
        </Button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.scheduled_date >= today && b.status === "confirmed");
  const past = bookings.filter((b) => b.scheduled_date < today || b.status !== "confirmed");

  const card = (b) => (
    <div key={b.id} data-testid={`booking-${b.id}`} className="bg-white border border-[#EFE4D0] rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <p className="font-display text-xl">{b.product_name}</p>
        <p className="text-sm text-[#5C6680] mt-1 flex items-center gap-3">
          <span className="flex items-center gap-1"><CalIcon size={12} />{b.scheduled_date}</span>
          <span className="flex items-center gap-1"><Clock size={12} />{b.scheduled_time}</span>
          <span className="uppercase tracking-[0.15em] text-[10px]">{b.timezone}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1 ${b.status === "confirmed" ? "bg-[#E8704C] text-white" : "bg-[#FFF0E6] text-[#5C6680]"}`}>{b.status}</span>
        {b.meeting_link && (
          <a href={b.meeting_link} target="_blank" rel="noreferrer" data-testid="join-btn">
            <Button variant="outline" className="border-[#E8704C] text-[#E8704C] hover:bg-[#E8704C] hover:text-[#FBF7EE]">
              <Video size={14} className="mr-2" />{t.dashboard.meeting}
            </Button>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="dashboard-page" className="max-w-5xl mx-auto px-6 lg:px-10 py-20">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">{t.dashboard.title}</h1>
          <p className="mt-2 text-[#5C6680]">{lang === "en" ? "Welcome back" : "Bienvenido de vuelta"}, {user.name}.</p>
        </div>
        <Link to="/pricing"><Button className="rounded-full bg-[#1F3B6E] text-[#FBF7EE] hover:bg-[#E8704C]">{t.dashboard.bookNew}</Button></Link>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl mb-4 border-l-2 border-[#E8704C] pl-4">{t.dashboard.upcoming}</h2>
        {loading ? <p>…</p> : upcoming.length === 0 ? (
          <p className="text-[#5C6680]">{t.dashboard.empty}</p>
        ) : <div className="space-y-3">{upcoming.map(card)}</div>}
      </section>

      {past.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl mb-4 border-l-2 border-[#5C6680] pl-4">{t.dashboard.past}</h2>
          <div className="space-y-3">{past.map(card)}</div>
        </section>
      )}
    </div>
  );
}
