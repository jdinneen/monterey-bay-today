import type { SourceStatus } from '../types';
import { StatusPill } from './StatusPill';

interface SourceTableProps {
  sources: SourceStatus[];
}

export function SourceTable({ sources }: SourceTableProps) {
  return (
    <section className="source-section">
      <div className="section-heading">
        <div>
          <span className="mini-label">Data lab</span>
          <h2>Where today&apos;s brief came from</h2>
        </div>
        <span>{sources.length} checked</span>
      </div>
      <div className="source-table">
        {sources.map((source) => (
          <div className="source-row" key={source.id}>
            <div>
              <strong>{source.title}</strong>
              <span>{source.message ?? source.kind}</span>
            </div>
            <StatusPill tone={source.freshness} />
          </div>
        ))}
      </div>
    </section>
  );
}
