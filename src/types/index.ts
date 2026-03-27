export interface AnimalRaw {
  IDE: string;
  Padre: string;
  Nacimiento?: string;
  // Other fields as present in the CSV
  [key: string]: any;
}

export interface EventoRaw {
  IDE: string;
  Fecha: string; // "DD/MM/YYYY" or similar
  Evento: string; // "Pesada", "Tacto Anestro", "Tacto IATF", etc.
  "N° Evento": number | string;
  GDM?: number | string;
  Peso?: number | string;
  "Estado reproductivo"?: string;
  "Tipo de Servicio"?: string;
  Comentarios?: string;
  [key: string]: any;
}

export interface ThresholdSettings {
  targetWeight: number; // e.g., 300
  gdmMin: number; // e.g., 0.400
  gdmOpt: number; // e.g., 0.800
  iatfWindowStart: Date | null;
  iatfWindowEnd: Date | null;
}

export interface ProcessedAnimal {
  ide: string;
  raza: string; // Fallback field as it was removed from raw, keep for backwards compatibility in UI until UI refactor
  padre: string; // "Otros Toros" if null or NO INFO
  masterServiceType: string | null;
  birthDate: Date | null;
  inventoryStatus: 'active' | 'archived' | 'unregistered';
  isActive: boolean; // active if they have an event on the MOST RECENT weigh date

  // Historical data
  eventos: ProcessedEvent[];

  // Current metrics (based on the latest event)
  currentWeight: number | null;
  currentGdm: number | null;
  averageGdm: number | null; // El GDM Histórico Promedio de este animal
  deltaGdm: number | null; // Velocidad de Caja (Current GDM - Previous GDM)
  pde: number | null; // Peso por Día de Edad: (CurrentWeight - BirthWeight) / DaysAlive
  reproductiveState: string | null; // e.g. "Preñada", "Ciclando", "Anestro Superficial", "Anestro Profundo"
  isApta: boolean; // True IF Tacto 1/2 was "Ciclando" AND projected weight > 300kg
  serviceWindowGdm: number | null; // Velocidad de Caja (GDM) medida en los ~30 días previos a la ventana de servicio

  // Horizon Score parts
  fase: 'Recría' | 'Selección'; // Recría = no tacto data; Selección = has tacto data
  scoreGdm: number; // A. GDM interpolation (max 30 pts)
  scoreReproductive: number; // C. Tacto state (max 40 pts; 0 in Recría phase)
  scoreConsistency: number; // B. Weight deviation vs lote avg (max 30 pts)
  scoreTotal: number; // 0-100 (Recría: (A+B)*1.667 | Selección: A+B+C)
  scoreCategory: 'ELITE' | 'COMERCIAL' | 'DESCARTE' | null;

  // Computed flags for Alerts
  daysToTarget: number | null; // (Target - CurrentWeight) / CurrentGDM
  alertRed: boolean; // GDM < 0 OR GDM < gdmMin OR "Anestro Profundo" in weight target OR Z-Score < -2
  alertYellow: boolean; // IATF Window delay
}

export interface ProcessedEvent {
  date: Date;
  type: string;
  eventNumber: number; // For strictly sequencing events
  weight: number | null;
  gdm: number | null;
  reproductiveState: string | null;
  serviceType: string | null;
  comments: string | null;
}

export interface SnapshotDate {
  id: string; // e.g. "actualidad", "pesada_1"
  label: string; // e.g. "Actualidad", "Pesada 1 - 24 de Junio"
  date: Date | null; // null means no cutoff
}

export interface DataAnomaly {
  ide: string;
  category: string;
  desc: string;
  location: string;
  cause: string;
}

export interface DashboardData {
  animals: ProcessedAnimal[];
  availableSnapshots: SnapshotDate[];
  anomalies: DataAnomaly[];
  dataMaxDate: Date | null;
}
