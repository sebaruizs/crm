"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DbTag { id: string; label: string; color: string; }

let cachedTags: DbTag[] | null = null;
let cachedPromise: Promise<DbTag[]> | null = null;

function loadTags(): Promise<DbTag[]> {
  if (cachedTags) return Promise.resolve(cachedTags);
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch("/api/tags", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { tags?: DbTag[] }) => {
      cachedTags = d.tags ?? [];
      return cachedTags;
    })
    .catch(() => []);
  return cachedPromise;
}

export default function TagBadge({ tagId }: { tagId: string }) {
  const [tags, setTags] = useState<DbTag[]>(cachedTags ?? []);
  useEffect(() => { if (!cachedTags) loadTags().then(setTags); }, []);
  const tag = tags.find((t) => t.id === tagId);
  if (!tag) return null;
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap", tag.color)}>
      {tag.label}
    </span>
  );
}
