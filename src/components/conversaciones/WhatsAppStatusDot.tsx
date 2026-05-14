import type { WhatsAppStatus } from "@/types";
import { cn } from "@/lib/utils";

const COLORS: Record<WhatsAppStatus, string> = {
  connected: "bg-green-400",
  disconnected: "bg-slate-300",
  pending: "bg-yellow-400",
};

const LABELS: Record<WhatsAppStatus, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  pending: "Pendiente",
};

export default function WhatsAppStatusDot({ status }: { status: WhatsAppStatus }) {
  return (
    <span title={LABELS[status]} className={cn("w-2.5 h-2.5 rounded-full shrink-0", COLORS[status])} />
  );
}
