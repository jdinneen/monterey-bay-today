import { AlertTriangle, CheckCircle2, Clock, Database, HelpCircle, Radio, Sparkles } from 'lucide-react';
import type { Confidence, EvidenceKind, Freshness, Severity } from '../types';

type PillTone = Freshness | Severity | Confidence | EvidenceKind;

interface StatusPillProps {
  tone: PillTone;
  label?: string;
}

const iconForTone = (tone: PillTone) => {
  if (tone === 'live') return Radio;
  if (tone === 'recent-cache') return CheckCircle2;
  if (tone === 'stale') return Clock;
  if (tone === 'imputed') return Sparkles;
  if (tone === 'blocked' || tone === 'high' || tone === 'elevated') return AlertTriangle;
  if (tone === 'model' || tone === 'status') return Database;
  return HelpCircle;
};

export function StatusPill({ tone, label }: StatusPillProps) {
  const Icon = iconForTone(tone);
  return (
    <span className={`status-pill tone-${tone}`}>
      <Icon aria-hidden="true" size={14} />
      {label ?? tone}
    </span>
  );
}

