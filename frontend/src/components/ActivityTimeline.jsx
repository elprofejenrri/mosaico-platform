import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const iconByRisk = {
  critical: AlertTriangle,
  high: AlertTriangle,
  completed: CheckCircle2,
};

export default function ActivityTimeline({ items = [], loading = false, emptyText = "No activity yet." }) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
        {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-[#FBF7EE]" />)}
      </div>
    );
  }

  if (!items.length) {
    return <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">{emptyText}</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const Icon = iconByRisk[item.risk_level || item.status] || Activity;
        return (
          <li key={item.id || `${item.event_type}-${item.created_at}`} className="flex gap-3 rounded-lg border border-[#EFE4D0] bg-white p-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FBF7EE] text-[#1F3B6E]">
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#1F3B6E]">{item.summary || item.event_type || item.action}</p>
                <span className="inline-flex items-center gap-1 text-xs text-[#5C6680]">
                  <Clock size={13} aria-hidden="true" />
                  {item.created_at ? new Date(item.created_at).toLocaleString() : "Pending"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5C6680]">{item.actor_name || item.actor_user_id || "System"} · {item.target_type || item.entity_type || "platform"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
