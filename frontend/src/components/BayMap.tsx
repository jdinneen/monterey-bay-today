import { MapPin } from 'lucide-react';
import type { MapPoint } from '../types';

interface BayMapProps {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (point: MapPoint) => void;
}

const pointPosition: Record<string, { left: string; top: string }> = {
  santa_cruz: { left: '28%', top: '24%' },
  moss_landing: { left: '52%', top: '48%' },
  monterey: { left: '61%', top: '74%' }
};

export function BayMap({ points, selectedId, onSelect }: BayMapProps) {
  return (
    <section className="bay-panel" aria-label="Monterey Bay signal map">
      <div className="panel-heading">
        <div>
          <span className="mini-label">Explore the bay</span>
          <h2>Bay places</h2>
        </div>
        <p>These are guide points for today&apos;s signals, not official boundaries.</p>
      </div>
      <div className="bay-map" role="img" aria-label="Signal points around Monterey Bay">
        <div className="land land-north" />
        <div className="land land-south" />
        <div className="water-shape" />
        {points.map((point) => {
          const pos = pointPosition[point.id] ?? { left: '50%', top: '50%' };
          return (
            <button
              className={`map-point severity-${point.severity}${selectedId === point.id ? ' active' : ''}`}
              key={point.id}
              onClick={() => onSelect?.(point)}
              style={pos}
              title={`${point.label}: ${point.summary}`}
              type="button"
            >
              <MapPin aria-hidden="true" size={18} />
              <span>{point.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
