import type { LeadsBySourceEntry } from "@/types";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/lib/constants";

interface Props {
  data: LeadsBySourceEntry[];
}

export default function LeadsBySourceChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Leads por fuente</h3>
      <div className="space-y-3">
        {data.map((entry) => (
          <div key={entry.source}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[entry.source]}`}>
                {SOURCE_LABELS[entry.source]}
              </span>
              <span className="text-xs text-slate-500">
                {entry.count} · {Math.round((entry.count / total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(entry.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
