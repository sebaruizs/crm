import type { Contact } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Props {
  contact: Contact;
  selected: boolean;
  unreadCount?: number;
  preview: string;
  starred?: boolean;
  onClick: () => void;
}

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
];

function avatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function ConversationListItem({ contact, selected, unreadCount, preview, starred, onClick }: Props) {
  const initials = contact.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-l-2 transition-colors",
        selected
          ? "bg-blue-50 border-l-blue-500"
          : "border-l-transparent hover:bg-slate-50"
      )}
    >
      <input
        type="checkbox"
        onClick={(e) => e.stopPropagation()}
        className="mt-1.5 rounded border-slate-300 shrink-0"
        readOnly
      />
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", avatarColor(contact.id))}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-900 truncate">{contact.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400">{formatRelativeTime(contact.lastMessageAt)}</span>
            {unreadCount ? (
              <span className="w-5 h-5 rounded-md bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 truncate">{preview}</p>
          <svg
            className={cn("w-3.5 h-3.5 shrink-0", starred ? "text-amber-400 fill-amber-400" : "text-slate-300")}
            fill={starred ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
