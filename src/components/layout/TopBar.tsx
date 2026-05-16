"use client";

import { usePathname } from "next/navigation";
import NotificationsBell from "./NotificationsBell";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/resumen": { title: "Resumen", subtitle: "Métricas y rendimiento del equipo" },
  "/contactos": { title: "Contactos", subtitle: "Gestión de leads y clientes" },
  "/conversaciones": { title: "Conversaciones", subtitle: "Bandeja de entrada del equipo" },
  "/clientes-potenciales": { title: "Clientes potenciales", subtitle: "Pipeline de ventas por WhatsApp" },
  "/automatizaciones": { title: "Automatizaciones", subtitle: "Reglas que se ejecutan automáticamente" },
  "/plantillas": { title: "Plantillas", subtitle: "Respuestas rápidas para el composer" },
  "/etiquetas": { title: "Etiquetas", subtitle: "Categorizar contactos" },
  "/etapas": { title: "Etapas del pipeline", subtitle: "Columnas del Kanban" },
  "/campos-personalizados": { title: "Campos personalizados", subtitle: "Datos extra para tus contactos" },
  "/usuarios": { title: "Usuarios", subtitle: "Administradores y agentes del CRM" },
  "/auditoria": { title: "Auditoría", subtitle: "Registro de acciones sensibles" },
  "/lineas": { title: "Líneas WhatsApp", subtitle: "Conexión de números vía Baileys" },
};

interface Props {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: Props) {
  const pathname = usePathname();
  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k)) ?? "/resumen";
  const { title, subtitle } = TITLES[key];

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationsBell />
      </div>
    </header>
  );
}
