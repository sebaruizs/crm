import type { Metadata } from "next";
import "./globals.css";
import ProtectedShell from "@/components/auth/ProtectedShell";
import { AgentsProvider } from "@/store/agents-store";

export const metadata: Metadata = {
  title: "AutoFlota CRM",
  description: "CRM de WhatsApp para alquiler de autos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AgentsProvider>
          <ProtectedShell>{children}</ProtectedShell>
        </AgentsProvider>
      </body>
    </html>
  );
}
