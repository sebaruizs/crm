import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { crmStore } from "@/server/store/crm-store";
import { baileys } from "@/server/baileys/manager";
import { parseMetaWebhook, downloadMetaMedia } from "@/server/wa/meta";
import { saveBuffer, classifyMime } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta sends:
 *  GET  /api/wa-webhook/[lineId]?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y
 *    -> respond with `Y` as text/plain if the token matches the line's verifyToken.
 *  POST /api/wa-webhook/[lineId]
 *    -> body has the message events. We ack with 200 to prevent retries,
 *       and process asynchronously.
 *
 * This route is intentionally PUBLIC (no withAuth). Meta authenticates
 * itself via the verifyToken handshake. Make sure to set your Meta
 * webhook URL to: https://<your-host>/api/wa-webhook/<line-id>
 */

export async function GET(req: NextRequest, { params }: { params: { lineId: string } }) {
  const url = req.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const line = await prisma.line.findUnique({ where: { id: params.lineId } });
  if (!line || line.provider !== "meta" || !line.verifyToken) {
    return new Response("not found", { status: 404 });
  }
  if (mode === "subscribe" && token === line.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("invalid", { status: 403 });
}

export async function POST(req: NextRequest, { params }: { params: { lineId: string } }) {
  const line = await prisma.line.findUnique({ where: { id: params.lineId } });
  if (!line || line.provider !== "meta") {
    // Don't reveal whether the line exists; just 200 so Meta doesn't retry.
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => ({}));
  const messages = parseMetaWebhook(body);

  await crmStore.init();
  await baileys.init();

  for (const m of messages) {
    // Download media if applicable
    let mediaMeta: {
      type: "image" | "video" | "audio" | "document";
      url: string;
      name?: string;
      mime?: string;
    } | undefined;
    if (m.mediaId && line.accessToken) {
      try {
        const dl = await downloadMetaMedia(m.mediaId, line.accessToken);
        if (dl) {
          const fileName = m.mediaFileName || `meta-${Date.now()}.${dl.mime.split("/")[1] ?? "bin"}`;
          const stored = await saveBuffer(dl.buf, fileName, dl.mime);
          mediaMeta = {
            type: classifyMime(dl.mime),
            url: `/api/files/${stored.id}`,
            name: m.mediaFileName ?? undefined,
            mime: dl.mime,
          };
        }
      } catch (err) {
        console.warn("[meta-webhook] media download failed:", err);
      }
    }

    // Upsert into CRM
    const { contact, isNew } = await crmStore.upsertFromInbound({
      lineId: line.id,
      fromNumber: m.from,
      fromName: m.fromName,
      body: m.body,
      mediaMeta,
      timestamp: m.timestamp,
      messageId: m.id,
    });

    // Also push to debug inbox for /lineas
    baileys.pushDebugInbox({
      id: m.id || randomUUID(),
      lineId: line.id,
      from: m.from,
      fromNumber: m.from,
      fromName: m.fromName,
      body: m.body || `(${m.type})`,
      timestamp: m.timestamp,
      isGroup: false,
    });

    // Run automations for brand-new contacts (welcome + auto-assign + chatbot)
    if (isNew) {
      const settings = await crmStore.getSettings();
      if (settings.autoAssignEnabled) {
        const { usersStore } = await import("@/server/store/users-store");
        await usersStore.init();
        const usersList = await usersStore.list();
        const eligible = usersList
          .filter((u) => settings.autoAssignRoles.includes(u.role))
          .map((u) => ({ id: u.id }));
        await crmStore.autoAssign(contact.id, eligible, settings.autoAssignStrategy);
      }
      if (settings.welcomeEnabled && settings.welcomeTemplateId) {
        const tpl = await crmStore.getTemplate(settings.welcomeTemplateId);
        if (tpl) {
          const firstName = contact.name.split(" ")[0].replace(/^\+/, "");
          const text = tpl.body.replace(/\{\{nombre\}\}/g, firstName);
          baileys.send(line.id, m.from, text).then(async (res) => {
            if (res.ok) await crmStore.appendOutbound(contact.id, text, res.id);
          }).catch(() => {});
        }
      }
    }

    // Chatbot flow handling (same logic as Baileys path)
    try {
      const settings = await crmStore.getSettings();
      if (settings.chatbotEnabled && settings.chatbotQuestions.length > 0) {
        // We don't have access to baileys.runChatbotStep since it's private.
        // For Meta, replicate the minimal flow inline: send next question or close.
        const c = await crmStore.get(contact.id);
        if (c) {
          const state = c.chatbotState ?? "idle";
          const step = c.chatbotStep ?? 0;
          const questions = settings.chatbotQuestions;
          let answers = c.chatbotAnswers ?? {};
          if (state === "idle") {
            const q = questions[0];
            const text = q.text.replace(/\{\{nombre\}\}/g, c.name.split(" ")[0].replace(/^\+/, ""));
            const res = await baileys.send(line.id, m.from, text);
            if (res.ok) await crmStore.appendOutbound(c.id, text, res.id);
            await crmStore.setChatbotState(c.id, "asking", 1, answers);
          } else if (state === "asking") {
            const answered = questions[step - 1];
            if (answered) answers = { ...answers, [answered.key]: m.body };
            if (step >= questions.length) {
              const res = await baileys.send(line.id, m.from, settings.chatbotClosing);
              if (res.ok) await crmStore.appendOutbound(c.id, settings.chatbotClosing, res.id);
              await crmStore.setChatbotState(c.id, "done", step, answers);
              const failed = questions.some((q) => {
                if (q.type !== "yes_no" || !q.failsIfNo) return false;
                const a = (answers[q.key] ?? "").trim().toLowerCase();
                return a === "no" || a.startsWith("n");
              });
              if (failed) await crmStore.patch(c.id, { status: "no_califica" });
            } else {
              const next = questions[step];
              const text = next.text.replace(/\{\{nombre\}\}/g, c.name.split(" ")[0].replace(/^\+/, ""));
              const res = await baileys.send(line.id, m.from, text);
              if (res.ok) await crmStore.appendOutbound(c.id, text, res.id);
              await crmStore.setChatbotState(c.id, "asking", step + 1, answers);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[meta-webhook] chatbot step failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
