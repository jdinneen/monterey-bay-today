import {
  Bot,
  CheckCircle2,
  Compass,
  Database,
  HelpCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Waves,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getTodayBrief, refreshSignals } from './api/client';
import { BayMap } from './components/BayMap';
import { BriefCardView } from './components/BriefCardView';
import { SourceTable } from './components/SourceTable';
import { StatusPill } from './components/StatusPill';
import type { BriefCard, MapPoint, TodayBrief } from './types';

type TabId = 'today' | 'explore' | 'data' | 'learn';
type CardFilter = 'all' | 'ocean' | 'beach' | 'algae' | 'ai';
type BuddyQuestion = 'safe' | 'changed' | 'ai' | 'proof';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'explore', label: 'Explore' },
  { id: 'data', label: 'Data Lab' },
  { id: 'learn', label: 'Learn' }
];

const filters: Array<{ id: CardFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'beach', label: 'Beach' },
  { id: 'algae', label: 'Algae' },
  { id: 'ai', label: 'AI watch' }
];

const cardGroup: Record<string, CardFilter> = {
  active_alerts: 'ocean',
  ocean_now: 'ocean',
  beach_water_quality: 'beach',
  hab_domoic_acid: 'algae',
  shadow_watchlist: 'ai',
  source_coverage: 'ai'
};

function formatDate(value: string | undefined) {
  if (!value) return 'Not built yet';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function kidSummary(card: BriefCard) {
  if (card.id === 'active_alerts') {
    return card.severity === 'elevated'
      ? 'A weather office alert is active near Monterey Bay. Read this before going near waves.'
      : 'No local alert is cached right now. Keep checking beach signs and official forecasts.';
  }
  if (card.id === 'ocean_now') {
    return 'Real ocean instruments are checking waves, wind, water temperature, and the tide.';
  }
  if (card.id === 'beach_water_quality') {
    return 'This card asks: could beach water be risky today? It uses past tests, rain, runoff, and model evidence.';
  }
  if (card.id === 'hab_domoic_acid') {
    return 'This card watches harmful algae toxin risk. That matters for shellfish and ocean food webs.';
  }
  if (card.id === 'shadow_watchlist') {
    return 'The AI is watching possible patterns, but these are clues, not safety warnings.';
  }
  if (card.id === 'source_coverage') {
    return 'This shows which datasets helped build the brief, like a receipt for the story.';
  }
  return card.summary;
}

function severityWord(card: BriefCard) {
  if (card.severity === 'elevated' || card.severity === 'high') return 'Pay attention';
  if (card.severity === 'watch') return 'Watch';
  return 'Steady';
}

function buddyAnswer(question: BuddyQuestion, brief: TodayBrief | null) {
  if (!brief) return 'I need today\'s brief first. Try Refresh.';
  const alerts = brief.cards.find((card) => card.id === 'active_alerts');
  const ocean = brief.cards.find((card) => card.id === 'ocean_now');
  const liveSources = brief.sources.filter((source) => source.freshness === 'live').length;

  if (question === 'safe') {
    if (alerts?.severity === 'elevated') {
      return 'There is an active beach or marine alert. That means slow down, check official signs, and ask an adult before going near the water.';
    }
    return 'I do not see an active alert in the cached brief, but this app is not an official closure notice. Check beach signs before swimming.';
  }
  if (question === 'changed') {
    return ocean?.summary
      ? `The newest live ocean notes say: ${ocean.summary}`
      : 'The local lakehouse is ready, but live ocean readings have not been refreshed yet.';
  }
  if (question === 'ai') {
    return 'AI helps compare today with old patterns. Cards marked model or imputed are smart guesses from evidence, not direct measurements.';
  }
  return `The brief is using ${brief.sources.length} sources, including ${liveSources} live feeds. Open any card or the Data Lab to see its source labels.`;
}

export default function App() {
  const [brief, setBrief] = useState<TodayBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [filter, setFilter] = useState<CardFilter>('all');
  const [selectedCard, setSelectedCard] = useState<BriefCard | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [buddyQuestion, setBuddyQuestion] = useState<BuddyQuestion>('safe');

  async function loadBrief() {
    setLoading(true);
    setError(null);
    try {
      const nextBrief = await getTodayBrief();
      setBrief(nextBrief);
      setSelectedPoint(nextBrief.map_points[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brief unavailable');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await refreshSignals();
      const nextBrief = await getTodayBrief();
      setBrief(nextBrief);
      setSelectedPoint(nextBrief.map_points[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadBrief();
  }, []);

  const cards = useMemo(() => brief?.cards ?? [], [brief]);
  const filteredCards = useMemo(
    () =>
      cards.filter((card) => {
        if (filter === 'all') return true;
        return cardGroup[card.id] === filter;
      }),
    [cards, filter]
  );

  const liveSources = brief?.sources.filter((source) => source.freshness === 'live').length ?? 0;
  const watchCount =
    brief?.cards.filter((card) => card.severity === 'watch' || card.severity === 'elevated' || card.severity === 'high')
      .length ?? 0;
  const alertCard = brief?.cards.find((card) => card.id === 'active_alerts');
  const heroState = alertCard?.severity === 'elevated' ? 'Heads up' : 'Bay checkup';

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">
              <Waves aria-hidden="true" size={19} />
            </span>
            <div>
              <span className="brand-kicker">Monterey Bay</span>
              <strong>Today Lab</strong>
            </div>
          </div>
          <div className="snapshot-pill">
            <span className="pulse-dot" />
            <span>{brief ? formatDate(brief.generated_at) : 'loading'}</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Site views">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        <section className={`view ${activeTab === 'today' ? 'active' : ''}`}>
          <section className="hero-panel">
            <img alt="Monterey Bay beach" src="/monterey-bay-beach.jpg" />
            <div className="hero-overlay" />
            <div className="hero-copy">
              <span className="mini-label light">{heroState}</span>
              <h1>What is Monterey Bay doing today?</h1>
              <p>{brief?.headline ?? 'Checking today\'s ocean, beach, algae, and AI signals.'}</p>
              <div className="hero-actions">
                <button className="primary-action" disabled={refreshing || loading} onClick={onRefresh} type="button">
                  <RefreshCw aria-hidden="true" className={refreshing ? 'spin' : ''} size={18} />
                  Refresh the bay
                </button>
                <button className="secondary-action" onClick={() => setActiveTab('data')} type="button">
                  <Database aria-hidden="true" size={18} />
                  Show sources
                </button>
              </div>
            </div>
          </section>

          <section className="stat-strip" aria-label="Brief status">
            <div>
              <span>Live feeds</span>
              <strong>{liveSources}</strong>
            </div>
            <div>
              <span>Things to watch</span>
              <strong>{watchCount}</strong>
            </div>
            <div>
              <span>Evidence cards</span>
              <strong>{cards.length}</strong>
            </div>
            <div>
              <span>Last built</span>
              <strong>{formatDate(brief?.generated_at)}</strong>
            </div>
          </section>

          {error && <div className="error-banner">{error}</div>}

          <section className="buddy-band">
            <div className="buddy-intro">
              <span className="buddy-icon">
                <Bot aria-hidden="true" size={20} />
              </span>
              <div>
                <span className="mini-label">AI Bay Buddy</span>
                <h2>Ask today&apos;s brief</h2>
              </div>
            </div>
            <div className="buddy-questions">
              <button className={buddyQuestion === 'safe' ? 'active' : ''} onClick={() => setBuddyQuestion('safe')} type="button">
                Can I go in?
              </button>
              <button
                className={buddyQuestion === 'changed' ? 'active' : ''}
                onClick={() => setBuddyQuestion('changed')}
                type="button"
              >
                What changed?
              </button>
              <button className={buddyQuestion === 'ai' ? 'active' : ''} onClick={() => setBuddyQuestion('ai')} type="button">
                What is AI doing?
              </button>
              <button
                className={buddyQuestion === 'proof' ? 'active' : ''}
                onClick={() => setBuddyQuestion('proof')}
                type="button"
              >
                Show proof
              </button>
            </div>
            <p>{buddyAnswer(buddyQuestion, brief)}</p>
          </section>

          <section className="section-top">
            <div>
              <span className="mini-label">Today cards</span>
              <h2>What to know first</h2>
            </div>
            <div className="filter-pills">
              {filters.map((item) => (
                <button className={filter === item.id ? 'active' : ''} key={item.id} onClick={() => setFilter(item.id)} type="button">
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="brief-grid">
            {loading && !brief ? (
              <div className="loading-panel">Loading Monterey Bay signals.</div>
            ) : (
              filteredCards.map((card) => (
                <BriefCardView
                  active={selectedCard?.id === card.id}
                  card={{ ...card, summary: kidSummary(card) }}
                  key={card.id}
                  onOpen={() => setSelectedCard(card)}
                />
              ))
            )}
          </section>
        </section>

        <section className={`view ${activeTab === 'explore' ? 'active' : ''}`}>
          <section className="split-view">
            <BayMap
              onSelect={(point) => setSelectedPoint(point)}
              points={brief?.map_points ?? []}
              selectedId={selectedPoint?.id}
            />
            <aside className="place-panel">
              <span className="mini-label">Selected place</span>
              <h2>{selectedPoint?.label ?? 'Bay place'}</h2>
              <p>{selectedPoint?.summary ?? 'Tap a map point to see what the brief is watching there.'}</p>
              <div className="place-checks">
                {cards.slice(0, 4).map((card) => (
                  <button key={card.id} onClick={() => setSelectedCard(card)} type="button">
                    <span>{severityWord(card)}</span>
                    <strong>{card.title}</strong>
                  </button>
                ))}
              </div>
            </aside>
          </section>
        </section>

        <section className={`view ${activeTab === 'data' ? 'active' : ''}`}>
          {brief && <SourceTable sources={brief.sources} />}
          <section className="verify-panel">
            <div>
              <span className="mini-label">Like Mission Control</span>
              <h2>Evidence before claims</h2>
              <p>
                Each card keeps its source labels. Live means a public feed answered. Recent cache means it came from the local lakehouse
                snapshot. Imputed means the app is showing a clue, not a direct measurement.
              </p>
            </div>
            <div className="proof-steps">
              <div>
                <CheckCircle2 aria-hidden="true" size={18} />
                <span>Source badge</span>
              </div>
              <div>
                <Search aria-hidden="true" size={18} />
                <span>Evidence drawer</span>
              </div>
              <div>
                <ShieldAlert aria-hidden="true" size={18} />
                <span>Official signs decide safety</span>
              </div>
            </div>
          </section>
        </section>

        <section className={`view ${activeTab === 'learn' ? 'active' : ''}`}>
          <section className="learn-grid">
            <article>
              <Compass aria-hidden="true" size={22} />
              <h2>What is a signal?</h2>
              <p>A signal is a clue: waves, rain, tides, lab tests, algae data, or a model pattern.</p>
            </article>
            <article>
              <Sparkles aria-hidden="true" size={22} />
              <h2>What is imputed?</h2>
              <p>It means the app filled in a careful estimate. It is useful, but it is not the same as a sensor reading.</p>
            </article>
            <article>
              <HelpCircle aria-hidden="true" size={22} />
              <h2>What is confidence?</h2>
              <p>High confidence has stronger evidence. Low confidence means the app is only pointing to a clue.</p>
            </article>
          </section>
        </section>
      </main>

      {selectedCard && (
        <div className="drawer-backdrop" onClick={() => setSelectedCard(null)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedCard(null)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
            <span className="mini-label">Evidence card</span>
            <h2>{selectedCard.title}</h2>
            <p className="drawer-summary">{selectedCard.summary}</p>
            <div className="drawer-pills">
              <StatusPill tone={selectedCard.freshness} />
              <StatusPill tone={selectedCard.evidence_kind} />
              <StatusPill tone={selectedCard.confidence} label={`${selectedCard.confidence} confidence`} />
            </div>
            <div className="drawer-section">
              <h3>Kid version</h3>
              <p>{kidSummary(selectedCard)}</p>
            </div>
            {selectedCard.observations.length > 0 && (
              <div className="drawer-section">
                <h3>Numbers and notes</h3>
                {selectedCard.observations.map((item, index) => (
                  <div className="drawer-row" key={`${item.source_id}-${item.label}-${index}`}>
                    <span>{item.label}</span>
                    <strong>
                      {String(item.value ?? 'n/a')}
                      {item.units ? ` ${item.units}` : ''}
                    </strong>
                  </div>
                ))}
              </div>
            )}
            {selectedCard.why && (
              <div className="drawer-section">
                <h3>Why the app says this</h3>
                <p>{selectedCard.why}</p>
              </div>
            )}
            <div className="drawer-section">
              <h3>Source IDs</h3>
              <p className="mono-line">{selectedCard.source_ids.join(', ') || 'none'}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
