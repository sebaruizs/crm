import type { Contact } from "@/types";

export const CONTACTS: Contact[] = [
  {
    id: "c1", name: "Ricardo Herrera", phone: "+5219991234567",
    source: "facebook_ads", status: "en_conversacion", assignedAgentId: "a1",
    tagIds: ["t1", "t4"], whatsAppStatus: "connected",
    createdAt: "2026-05-10T09:15:00Z", lastMessageAt: "2026-05-13T11:42:00Z",
    licenseVerified: false, vehicleInterest: "Sedán 2024",
    notes: [
      { id: "n1", content: "Interesado en plan semanal. Trabaja para Uber.", createdAt: "2026-05-11T10:00:00Z", authorId: "a1" }
    ],
    messageHistory: [
      { id: "m1", direction: "inbound", body: "Hola, vi su anuncio en Facebook. ¿Tienen sedanes disponibles?", sentAt: "2026-05-10T09:15:00Z", status: "read" },
      { id: "m2", direction: "outbound", body: "Hola Ricardo! Claro, tenemos varios modelos disponibles. ¿Para cuándo lo necesitas?", sentAt: "2026-05-10T09:18:00Z", status: "read" },
      { id: "m3", direction: "inbound", body: "Lo necesito desde el lunes que viene", sentAt: "2026-05-13T11:42:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Cancún" },
      { key: "plataforma", label: "Plataforma", value: "Uber" },
      { key: "antiguedad", label: "Antigüedad en plataforma", value: "2 años" },
    ],
  },
  {
    id: "c2", name: "Ana Martínez", phone: "+5218001234567",
    source: "facebook_ads", status: "nuevo_lead",
    tagIds: ["t5"], whatsAppStatus: "connected",
    createdAt: "2026-05-13T08:00:00Z", lastMessageAt: "2026-05-13T08:00:00Z",
    licenseVerified: false, vehicleInterest: "SUV 2023",
    notes: [],
    messageHistory: [
      { id: "m4", direction: "inbound", body: "Buenos días, me interesa rentar un auto para DiDi. ¿Cuánto cuesta?", sentAt: "2026-05-13T08:00:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Mérida" },
      { key: "plataforma", label: "Plataforma", value: "DiDi" },
    ],
  },
  {
    id: "c3", name: "Jorge Castillo", phone: "+5217771234567",
    source: "instagram", status: "en_evaluacion", assignedAgentId: "a1",
    tagIds: ["t3", "t4"], whatsAppStatus: "connected",
    createdAt: "2026-05-08T14:00:00Z", lastMessageAt: "2026-05-12T16:30:00Z",
    licenseVerified: true, vehicleInterest: "Sedán 2025",
    notes: [
      { id: "n2", content: "Tiene licencia vigente. Espera cotización de plan mensual.", createdAt: "2026-05-09T10:00:00Z", authorId: "a1" },
      { id: "n3", content: "Envié cotización el día 10. Está comparando con la competencia.", createdAt: "2026-05-10T12:00:00Z", authorId: "a1" },
    ],
    messageHistory: [
      { id: "m5", direction: "inbound", body: "Hola! Vi su perfil en Instagram. ¿Tienen planes mensuales?", sentAt: "2026-05-08T14:00:00Z", status: "read" },
      { id: "m6", direction: "outbound", body: "Sí! Tenemos planes desde $6,500 al mes todo incluido. ¿Tienes licencia vigente?", sentAt: "2026-05-08T14:05:00Z", status: "read" },
      { id: "m7", direction: "inbound", body: "Sí, tengo licencia. ¿Me puedes mandar los detalles?", sentAt: "2026-05-08T14:10:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Guadalajara" },
      { key: "plataforma", label: "Plataforma", value: "Uber" },
      { key: "antiguedad", label: "Antigüedad en plataforma", value: "6 meses" },
    ],
  },
  {
    id: "c4", name: "María González", phone: "+5216661234567",
    source: "whatsapp_link", status: "agendado_visita", assignedAgentId: "a3",
    tagIds: ["t4", "t2"], whatsAppStatus: "connected",
    createdAt: "2026-05-07T10:00:00Z", lastMessageAt: "2026-05-12T09:00:00Z",
    licenseVerified: true, vehicleInterest: "Hatchback 2024",
    visitScheduledAt: "2026-05-15T10:00:00Z",
    notes: [
      { id: "n4", content: "Visita agendada para el viernes 15 a las 10am. Traerá licencia original.", createdAt: "2026-05-12T09:00:00Z", authorId: "a3" }
    ],
    messageHistory: [
      { id: "m8", direction: "inbound", body: "Hola, me mandaron el link. Quiero saber de los autos para Uber.", sentAt: "2026-05-07T10:00:00Z", status: "read" },
      { id: "m9", direction: "outbound", body: "Bienvenida María! ¿Puedes venir a nuestras instalaciones para conocer los vehículos?", sentAt: "2026-05-07T10:05:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "CDMX" },
      { key: "plataforma", label: "Plataforma", value: "Uber" },
    ],
  },
  {
    id: "c5", name: "Luis Pérez", phone: "+5215551234567",
    source: "facebook_ads", status: "no_califica", assignedAgentId: "a2",
    tagIds: ["t7"], whatsAppStatus: "disconnected",
    createdAt: "2026-05-09T11:00:00Z", lastMessageAt: "2026-05-10T15:00:00Z",
    licenseVerified: false,
    notes: [
      { id: "n5", content: "No tiene licencia de conducir. No puede rentar por el momento.", createdAt: "2026-05-10T15:00:00Z", authorId: "a2" }
    ],
    messageHistory: [
      { id: "m10", direction: "inbound", body: "Hola quiero rentar un carro para Uber pero no tengo licencia todavía", sentAt: "2026-05-09T11:00:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Monterrey" },
    ],
  },
  {
    id: "c6", name: "Carmen Ruiz", phone: "+5214441234567",
    source: "referido", status: "cancelado", assignedAgentId: "a3",
    tagIds: [], whatsAppStatus: "disconnected",
    createdAt: "2026-05-05T09:00:00Z", lastMessageAt: "2026-05-08T17:00:00Z",
    licenseVerified: true,
    notes: [
      { id: "n6", content: "Canceló. Encontró auto propio.", createdAt: "2026-05-08T17:00:00Z", authorId: "a3" }
    ],
    messageHistory: [
      { id: "m11", direction: "inbound", body: "Me avisaron de su servicio. Estaba interesada pero ya conseguí mi propio auto.", sentAt: "2026-05-08T17:00:00Z", status: "read" },
    ],
    customFields: [{ key: "ciudad", label: "Ciudad", value: "Puebla" }],
  },
  {
    id: "c7", name: "Roberto Sánchez", phone: "+5213331234567",
    source: "facebook_ads", status: "nuevo_lead",
    tagIds: ["t6"], whatsAppStatus: "pending",
    createdAt: "2026-05-13T10:30:00Z", lastMessageAt: "2026-05-13T10:30:00Z",
    licenseVerified: false, vehicleInterest: "Sedán 2024",
    notes: [],
    messageHistory: [
      { id: "m12", direction: "inbound", body: "Buen día, vi el anuncio en Facebook. ¿Aceptan choferes de InDriver?", sentAt: "2026-05-13T10:30:00Z", status: "delivered" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Tijuana" },
      { key: "plataforma", label: "Plataforma", value: "InDriver" },
    ],
  },
  {
    id: "c8", name: "Patricia Flores", phone: "+5212221234567",
    source: "instagram", status: "en_conversacion", assignedAgentId: "a4",
    tagIds: ["t4", "t1"], whatsAppStatus: "connected",
    createdAt: "2026-05-12T13:00:00Z", lastMessageAt: "2026-05-13T09:15:00Z",
    licenseVerified: true, vehicleInterest: "Sedán 2025",
    notes: [
      { id: "n7", content: "Muy interesada. Tiene experiencia de 3 años en Uber.", createdAt: "2026-05-12T14:00:00Z", authorId: "a4" }
    ],
    messageHistory: [
      { id: "m13", direction: "inbound", body: "Hola! Vi en Instagram que rentan autos para Uber. ¿Tienen disponibilidad?", sentAt: "2026-05-12T13:00:00Z", status: "read" },
      { id: "m14", direction: "outbound", body: "Hola Patricia! Sí tenemos disponibilidad. ¿Qué tipo de vehículo buscas?", sentAt: "2026-05-12T13:10:00Z", status: "read" },
      { id: "m15", direction: "inbound", body: "Busco un sedán. ¿Cuánto cobran por semana?", sentAt: "2026-05-13T09:15:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "CDMX" },
      { key: "plataforma", label: "Plataforma", value: "Uber" },
      { key: "antiguedad", label: "Antigüedad en plataforma", value: "3 años" },
    ],
  },
  {
    id: "c9", name: "Eduardo Jiménez", phone: "+5211111234567",
    source: "facebook_ads", status: "en_evaluacion", assignedAgentId: "a2",
    tagIds: ["t5", "t3"], whatsAppStatus: "connected",
    createdAt: "2026-05-06T08:00:00Z", lastMessageAt: "2026-05-11T14:00:00Z",
    licenseVerified: true, vehicleInterest: "SUV 2023",
    notes: [
      { id: "n8", content: "Quiere SUV para DiDi Plus. Revisando términos del contrato.", createdAt: "2026-05-11T14:00:00Z", authorId: "a2" }
    ],
    messageHistory: [
      { id: "m16", direction: "inbound", body: "¿Tienen SUVs? Necesito para DiDi Plus.", sentAt: "2026-05-06T08:00:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Monterrey" },
      { key: "plataforma", label: "Plataforma", value: "DiDi" },
    ],
  },
  {
    id: "c10", name: "Valentina Cruz", phone: "+5210001234567",
    source: "whatsapp_link", status: "agendado_visita", assignedAgentId: "a1",
    tagIds: ["t4"], whatsAppStatus: "connected",
    createdAt: "2026-05-11T11:00:00Z", lastMessageAt: "2026-05-13T08:45:00Z",
    licenseVerified: true, vehicleInterest: "Hatchback 2024",
    visitScheduledAt: "2026-05-14T15:00:00Z",
    notes: [
      { id: "n9", content: "Visita mañana miércoles a las 3pm.", createdAt: "2026-05-13T08:45:00Z", authorId: "a1" }
    ],
    messageHistory: [
      { id: "m17", direction: "inbound", body: "Hola, quiero saber sobre sus autos para Uber", sentAt: "2026-05-11T11:00:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Guadalajara" },
      { key: "plataforma", label: "Plataforma", value: "Uber" },
    ],
  },
  {
    id: "c11", name: "Héctor Morales", phone: "+5219991111111",
    source: "facebook_ads", status: "nuevo_lead",
    tagIds: ["t5"], whatsAppStatus: "connected",
    createdAt: "2026-05-13T07:50:00Z", lastMessageAt: "2026-05-13T07:50:00Z",
    licenseVerified: false,
    notes: [],
    messageHistory: [
      { id: "m18", direction: "inbound", body: "Buen día. Vi el anuncio y me interesa rentar para DiDi.", sentAt: "2026-05-13T07:50:00Z", status: "read" },
    ],
    customFields: [{ key: "ciudad", label: "Ciudad", value: "Querétaro" }],
  },
  {
    id: "c12", name: "Daniela López", phone: "+5218882222222",
    source: "instagram", status: "en_conversacion", assignedAgentId: "a2",
    tagIds: ["t4", "t2"], whatsAppStatus: "connected",
    createdAt: "2026-05-12T16:00:00Z", lastMessageAt: "2026-05-13T10:00:00Z",
    licenseVerified: true, vehicleInterest: "Sedán 2024",
    notes: [],
    messageHistory: [
      { id: "m19", direction: "inbound", body: "Hola! ¿Cuánto cuesta la renta semanal de un sedán?", sentAt: "2026-05-12T16:00:00Z", status: "read" },
      { id: "m20", direction: "outbound", body: "Hola Daniela! El plan semanal está en $1,800 incluye seguro y GPS.", sentAt: "2026-05-12T16:05:00Z", status: "read" },
    ],
    customFields: [
      { key: "ciudad", label: "Ciudad", value: "Cancún" },
      { key: "plataforma", label: "Plataforma", value: "Uber" },
    ],
  },
];
