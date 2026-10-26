/**
 * Estándar 104 (TH1) — Resolución 5095 de 2018, Manual de Acreditación en Salud
 * Ambulatorio y Hospitalario v3.1.
 *
 * IMPORTANTE: la denominación de los 15 criterios proviene del documento de
 * requerimientos del proyecto. NO fue cotejada contra el texto oficial del manual
 * durante el desarrollo (el PDF oficial no fue accesible en formato de texto).
 * Antes de usar el sistema como soporte ante evaluadores, el área de Calidad debe
 * verificar la redacción literal contra la página 55 del manual y ajustarla aquí.
 */
import type { NeedCategory } from "@/db/schema";

export const TH1_VERIFIED_AGAINST_OFFICIAL_TEXT = false;

export interface Th1Criterion {
  n: number;
  name: string;
  /** Cómo lo apoya el software en la Fase 1 (no es evidencia de cumplimiento por sí mismo). */
  phase1: "GESTION" | "REGISTRO" | "FASE_2" | "FASE_3";
}

export const TH1_CRITERIA: Th1Criterion[] = [
  { n: 1, name: "Legislación", phase1: "REGISTRO" },
  { n: 2, name: "Evaluación periódica de expectativas y necesidades", phase1: "GESTION" },
  { n: 3, name: "Evaluación periódica del clima organizacional", phase1: "FASE_2" },
  { n: 4, name: "Evaluación periódica de competencias y desempeño", phase1: "REGISTRO" },
  { n: 5, name: "Calidad de vida en el trabajo", phase1: "REGISTRO" },
  { n: 6, name: "Cargas de trabajo, turnos, descansos, fatiga y riesgos laborales", phase1: "REGISTRO" },
  { n: 7, name: "Análisis de puestos de trabajo", phase1: "REGISTRO" },
  { n: 8, name: "Convocatoria, selección, vinculación, retención, promoción, seguimiento y retiro", phase1: "REGISTRO" },
  { n: 9, name: "Políticas de compensación y escala salarial", phase1: "REGISTRO" },
  { n: 10, name: "Estímulos e incentivos", phase1: "REGISTRO" },
  { n: 11, name: "Bienestar laboral", phase1: "REGISTRO" },
  { n: 12, name: "Necesidades de comunicación organizacional", phase1: "REGISTRO" },
  { n: 13, name: "Transformación de la cultura organizacional", phase1: "REGISTRO" },
  { n: 14, name: "Relación docencia-servicio", phase1: "REGISTRO" },
  { n: 15, name: "Efectividad de la respuesta", phase1: "GESTION" },
];

export const th1Name = (n: number | null | undefined) =>
  n ? (TH1_CRITERIA.find((c) => c.n === n)?.name ?? `Criterio ${n}`) : "Sin criterio";

export const CATEGORY_LABEL: Record<NeedCategory, string> = {
  CONDICIONES_TRABAJO: "Condiciones para realizar el trabajo",
  FORMACION_COMPETENCIAS: "Formación y competencias",
  BIENESTAR_DESARROLLO: "Bienestar y desarrollo",
  CARGA_ORGANIZACION: "Carga y organización del trabajo",
  COMUNICACION: "Comunicación institucional",
  CULTURA_CLIMA: "Cultura y clima",
  CICLO_VIDA_LABORAL: "Selección, vinculación, inducción y retiro",
  COMPENSACION_INCENTIVOS: "Compensación, estímulos e incentivos",
  DOCENCIA_SERVICIO: "Docencia-servicio",
  OTRA: "Otra",
};

/** Nombre corto para gráficos. */
export const CATEGORY_SHORT: Record<NeedCategory, string> = {
  CONDICIONES_TRABAJO: "Condiciones",
  FORMACION_COMPETENCIAS: "Formación",
  BIENESTAR_DESARROLLO: "Bienestar",
  CARGA_ORGANIZACION: "Carga laboral",
  COMUNICACION: "Comunicación",
  CULTURA_CLIMA: "Cultura y clima",
  CICLO_VIDA_LABORAL: "Ciclo laboral",
  COMPENSACION_INCENTIVOS: "Incentivos",
  DOCENCIA_SERVICIO: "Docencia",
  OTRA: "Otra",
};

/** Criterio TH1 sugerido por categoría. Talento Humano puede cambiarlo al clasificar. */
export const CATEGORY_DEFAULT_TH1: Record<NeedCategory, number> = {
  CONDICIONES_TRABAJO: 7,
  FORMACION_COMPETENCIAS: 4,
  BIENESTAR_DESARROLLO: 11,
  CARGA_ORGANIZACION: 6,
  COMUNICACION: 12,
  CULTURA_CLIMA: 13,
  CICLO_VIDA_LABORAL: 8,
  COMPENSACION_INCENTIVOS: 10,
  DOCENCIA_SERVICIO: 14,
  OTRA: 2,
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as NeedCategory[];
