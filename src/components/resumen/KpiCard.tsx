import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  accentClass: string;
}

export default function KpiCard({ label, value, delta, deltaPositive, icon, accentClass }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", accentClass)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {delta && (
          <p className={cn("text-xs mt-1 font-medium", deltaPositive ? "text-emerald-600" : "text-red-500")}>
            {deltaPositive ? "▲" : "▼"} {delta} vs semana pasada
          </p>
        )}
      </div>
    </div>
  );
}
