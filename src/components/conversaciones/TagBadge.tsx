import { TAGS } from "@/mock/tags";
import { cn } from "@/lib/utils";

export default function TagBadge({ tagId }: { tagId: string }) {
  const tag = TAGS.find((t) => t.id === tagId);
  if (!tag) return null;
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap", tag.color)}>
      {tag.label}
    </span>
  );
}
