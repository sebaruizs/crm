"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/resumen": { title: "Resumen", subtitle: "Métricas y rendimiento del equipo" },
  "/contactos": { title: "Contactos", subtitle: "Gestión de leads y clientes" },
  "/conversaciones": { title: "Conversaciones", subtitle: "Bandeja de entrada del equipo" },
  "/clientes-potenciales": { title: "Clientes potenciales", subtitle: "Pipeline de ventas por WhatsApp" },
  "/plantillas": { title: "Plantillas", subtitle: "Respuestas rápidas para el composer" },
  "/usuarios": { title: "Usuarios", subtitle: "Administradores y agentes del CRM" },
  "/lineas": { title: "Líneas WhatsApp", subtitle: "Conexión de números vía Baileys" },
};

export default function TopBar() {
  const pathname = usePathname();
  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k)) ?? "/resumen";
  const { title, subtitle } = TITLES[key];

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva conversación
        </button>
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
