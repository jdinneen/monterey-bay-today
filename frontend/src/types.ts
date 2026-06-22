export type Freshness = 'live' | 'recent-cache' | 'stale' | 'imputed' | 'blocked' | 'unknown';
export type Severity = 'info' | 'watch' | 'elevated' | 'high';
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type EvidenceKind = 'observed' | 'model' | 'imputed' | 'digest' | 'status' | 'blocked';

export interface SignalObservation {
  source_id: string;
  label: string;
  value: string | number | boolean | null;
  units?: string | null;
  observed_at?: string | null;
  freshness: Freshness;
  evidence_kind: EvidenceKind;
  confidence: Confidence;
  details: Record<string, unknown>;
}

export interface BriefCard {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  confidence: Confidence;
  evidence_kind: EvidenceKind;
  freshness: Freshness;
  source_ids: string[];
  observations: SignalObservation[];
  why?: string | null;
}

export interface MapPoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
  severity: Severity;
  summary: string;
}

export interface SourceStatus {
  id: string;
  title: string;
  kind: string;
  freshness: Freshness;
  serving_allowed: boolean;
  path?: string | null;
  url?: string | null;
  checked_at?: string | null;
  observed_at?: string | null;
  age_minutes?: number | null;
  message?: string | null;
}

export interface TodayBrief {
  region_id: string;
  region_name: string;
  generated_at: string;
  headline: string;
  cards: BriefCard[];
  map_points: MapPoint[];
  sources: SourceStatus[];
  notes: string[];
}

