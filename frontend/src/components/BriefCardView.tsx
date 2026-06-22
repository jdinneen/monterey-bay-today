import {
  AlertTriangle,
  Database,
  Droplets,
  FlaskConical,
  Info,
  Radar,
  Waves
} from 'lucide-react';
import type { BriefCard } from '../types';
import { StatusPill } from './StatusPill';

interface BriefCardViewProps {
  card: BriefCard;
  active?: boolean;
  onOpen?: (card: BriefCard) => void;
}

const iconForCard = (id: string) => {
  if (id === 'active_alerts') return AlertTriangle;
  if (id === 'ocean_now') return Waves;
  if (id === 'beach_water_quality') return Droplets;
  if (id === 'hab_domoic_acid') return FlaskConical;
  if (id === 'shadow_watchlist') return Radar;
  if (id === 'source_coverage') return Database;
  return Info;
};

export function BriefCardView({ card, active, onOpen }: BriefCardViewProps) {
  const Icon = iconForCard(card.id);
  return (
    <article className={`brief-card severity-${card.severity}${active ? ' active' : ''}`}>
      <header className="card-header">
        <div className="card-title">
          <span className="card-icon">
            <Icon aria-hidden="true" size={20} />
          </span>
          <h2>{card.title}</h2>
        </div>
        <div className="card-pills">
          <StatusPill tone={card.freshness} />
          <StatusPill tone={card.confidence} label={`${card.confidence} confidence`} />
        </div>
      </header>
      <p className="card-summary">{card.summary}</p>
      {card.observations.length > 0 && (
        <div className="observation-list">
          {card.observations.slice(0, 5).map((item, index) => (
            <div className="observation-row" key={`${item.source_id}-${item.label}-${index}`}>
              <span className="observation-label">{item.label}</span>
              <span className="observation-value">
                {String(item.value ?? 'n/a')}
                {item.units ? ` ${item.units}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {card.why && <p className="why-line">{card.why}</p>}
      {onOpen && (
        <button className="open-card-button" onClick={() => onOpen(card)} type="button">
          See the evidence
        </button>
      )}
    </article>
  );
}
