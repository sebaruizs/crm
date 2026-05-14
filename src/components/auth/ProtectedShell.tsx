"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAgents } from "@/store/agents-store";
import AppShell from "@/components/layout/AppShell";

const PUBLIC_ROUTES = ["/login"];

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, hydrated } = useAgents();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser && !isPublic) {
      router.replace("/login");
    }
  }, [hydrated, currentUser, isPublic, router]);

  // Loading state while hydrating session from localStorage
  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login page: render without app shell
  if (isPublic) {
    return <>{children}</>;
  }

  // No session and not on public route: blank while redirect runs
  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
