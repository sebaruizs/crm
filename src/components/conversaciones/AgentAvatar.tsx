"use client";

import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";

export default function AgentAvatar({ agentId }: { agentId?: string }) {
  const { findAgent } = useAgents();
  const agent = findAgent(agentId);
  if (!agent) return null;
  return (
    <div
      title={agent.name}
      className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", agent.color)}
    >
      {agent.avatarInitials}
    </div>
  );
}
