import { useEffect, useState } from 'react';
import { getTodayBrief } from './api/client';
import type { TodayBrief } from './types';

const spots = [
  { name: 'Monterey Bay Aquarium', emoji: '🐠', x: 40, y: 58, chipBg: '#FFD23F', blurb: 'A giant aquarium where you can watch sea otters, sharks, and a towering kelp forest.', fact: 'It has a window 90 feet wide — one of the biggest in the world!' },
  { name: 'Moss Landing', emoji: '🦦', x: 70, y: 30, chipBg: '#7CD8C8', blurb: 'The best place to spot rafts of sea otters floating together on the water.', fact: 'Otters hold hands so they don’t drift apart while they nap!' },
  { name: 'Point Lobos', emoji: '🐋', x: 22, y: 78, chipBg: '#FF9F8E', blurb: 'Wild cliffs and hidden coves. In winter you can see whales spouting offshore.', fact: 'Gray whales swim past here on a 10,000-mile trip every year.' },
  { name: 'Lovers Point', emoji: '🏖️', x: 55, y: 44, chipBg: '#FFD23F', blurb: 'Calm, shallow water and rocky tide pools — perfect for little explorers.', fact: 'The water here is so clear you can watch fish from the rocks.' },
  { name: 'Cannery Row', emoji: '🏬', x: 48, y: 50, chipBg: '#7CD8C8', blurb: 'A street of old sardine factories turned into shops, candy stores, and fun.', fact: 'It was once the busiest fishing street on the whole West Coast.' },
  { name: 'Carmel Beach', emoji: '🐚', x: 18, y: 64, chipBg: '#FF9F8E', blurb: 'Soft white sand and big rolling waves — bring a bucket for shells!', fact: 'The sand is white because it’s made of tiny bits of granite rock.' },
];

const creatures = [
  { name: 'Sea Star', emoji: '⭐', tag: 'Super-healer', swaySpeed: '5s', fact: 'A sea star can grow back a whole new arm if it loses one. Some can even grow a new body from a single arm!', find: 'stuck flat on rocks just under the water.' },
  { name: 'Hermit Crab', emoji: '🦀', tag: 'House mover', swaySpeed: '4s', fact: 'It lives in a borrowed snail shell and trades up to a bigger one as it grows.', find: 'scuttling along the sandy bottom of the pool.' },
  { name: 'Sea Anemone', emoji: '🌸', tag: 'Sneaky stinger', swaySpeed: '6s', fact: 'It looks like a soft flower, but it’s really an animal that stings tiny fish for dinner.', find: 'squishy blobs clinging to the rocks.' },
  { name: 'Sea Snail', emoji: '🐌', tag: 'Rock licker', swaySpeed: '5.5s', fact: 'It scrapes algae off the rocks with a tongue covered in thousands of tiny teeth!', find: 'slowly gliding along the pool walls.' },
  { name: 'Mussel', emoji: '🦪', tag: 'Super-gluer', swaySpeed: '4.5s', fact: 'A mussel glues itself to rocks with threads stronger than most man-made glue.', find: 'in dark clumps where the waves splash.' },
  { name: 'Sea Urchin', emoji: '🟣', tag: 'Spiky muncher', swaySpeed: '6.5s', fact: 'This spiky purple ball munches kelp all day and walks on hundreds of tiny tube feet.', find: 'wedged into cracks in the rocks.' },
];

const facts = [
  { name: 'Sea Otter', emoji: '🦦', bg: '#FFE3A8', fact: 'It eats a quarter of its body weight every day and uses rocks as tools to crack open shells!' },
  { name: 'Humpback Whale', emoji: '🐋', bg: '#9FD8F0', fact: 'As long as a school bus — and it leaps right out of the water with a giant splash!' },
  { name: 'Great White Shark', emoji: '🦈', bg: '#CFE4EE', fact: 'It can smell one drop of blood in a huge amount of water, but it’s usually shy around people.' },
  { name: 'Moon Jelly', emoji: '🪼', bg: '#E3CFF0', fact: 'It has no brain, no bones, and no heart — it just drifts wherever the tide takes it.' },
  { name: 'Giant Kelp', emoji: '🌿', bg: '#BEE8C2', fact: 'It grows up to 2 feet in a single day, building an underwater forest fish love to hide in.' },
  { name: 'Harbor Seal', emoji: '🦭', bg: '#CFD8E6', fact: 'It can nap underwater and hold its breath for almost 30 minutes!' },
];

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

export default function App() {
  const [brief, setBrief] = useState<TodayBrief | null>(null);
  const [spotIdx, setSpotIdx] = useState(0);
  const [creatureIdx, setCreatureIdx] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function fetchBrief() {
      try {
        const data = await getTodayBrief();
        setBrief(data);
      } catch (err) {
        console.error('Failed to load brief', err);
      }
    }
    void fetchBrief();
  }, []);

  const activeSpot = spots[spotIdx];
  const activeCreature = creatures[creatureIdx];

  const toggleFlip = (i: number) => {
    setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const dateStr = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();

  // Data Extraction
  let airTemp = 66;
  let waterTemp = 55;
  let waveHeight = 3;
  let windSpeed = 8;
  let tideState = 'Rising 🔼';
  
  if (brief) {
    const oceanCard = brief.cards.find(c => c.id === 'ocean_now');
    if (oceanCard) {
      for (const obs of oceanCard.observations) {
        const lbl = obs.label.toLowerCase();

        if (lbl.includes('air temp')) {
          let val = Number(obs.value);
          if (isNaN(val)) continue;
          if (obs.units === 'degC' || obs.units === 'C') val = val * 9 / 5 + 32;
          airTemp = Math.round(val);
        } else if (lbl.includes('water temp')) {
          let val = Number(obs.value);
          if (isNaN(val)) continue;
          if (obs.units === 'degC' || obs.units === 'C') val = val * 9 / 5 + 32;
          waterTemp = Math.round(val);
        } else if (lbl.includes('wave')) {
          let val = Number(obs.value);
          if (isNaN(val)) continue;
          if (obs.units === 'm') val = val * 3.28084;
          waveHeight = Math.round(val);
        } else if (lbl.includes('wind')) {
          let val = Number(obs.value);
          if (isNaN(val)) continue;
          if (obs.units === 'm/s') val = val * 2.23694;
          windSpeed = Math.round(val);
        } else if (lbl.includes('tide') && typeof obs.value === 'string') {
          tideState = obs.value;
        }
      }
    }
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", color: "#163A5F", background: "#FFF6E6", overflowX: "hidden" }}>
      
      {/* NAV */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", borderBottom: "3px solid #163A5F", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px", gap: "14px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "22px" }}>
          <span style={{ fontSize: "28px" }}>🌊</span> Monterey Bay Today
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a href="#today" style={{ textDecoration: "none", color: "#163A5F", fontWeight: 800, background: "#FFD23F", padding: "8px 16px", borderRadius: "999px", border: "2px solid #163A5F", boxShadow: "0 3px 0 #163A5F" }}>Today</a>
          <a href="#map" style={{ textDecoration: "none", color: "#163A5F", fontWeight: 800, background: "#7CD8C8", padding: "8px 16px", borderRadius: "999px", border: "2px solid #163A5F", boxShadow: "0 3px 0 #163A5F" }}>Cool Spots</a>
          <a href="#tidepool" style={{ textDecoration: "none", color: "#163A5F", fontWeight: 800, background: "#FF9F8E", padding: "8px 16px", borderRadius: "999px", border: "2px solid #163A5F", boxShadow: "0 3px 0 #163A5F" }}>Tide Pools</a>
          <a href="#sealife" style={{ textDecoration: "none", color: "#fff", fontWeight: 800, background: "#3A8DDE", padding: "8px 16px", borderRadius: "999px", border: "2px solid #163A5F", boxShadow: "0 3px 0 #163A5F" }}>Sea Life</a>
        </div>
      </div>

      {/* HERO */}
      <div style={{ position: "relative", padding: "56px 22px 0", background: "linear-gradient(180deg, #5FB8F0 0%, #9FD8F8 60%, #BFE9FF 100%)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "36px", right: "8%", width: "90px", height: "90px", borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #FFE89A, #FFC93C)", boxShadow: "0 0 0 12px rgba(255,210,63,0.25)", animation: "mbt-spin 60s linear infinite" }}></div>
        <div style={{ position: "absolute", top: "70px", left: "12%", width: "120px", height: "42px", background: "#fff", borderRadius: "999px", opacity: 0.9, animation: "mbt-drift 9s ease-in-out infinite alternate" }}></div>
        <div style={{ position: "absolute", top: "120px", left: "30%", width: "80px", height: "30px", background: "#fff", borderRadius: "999px", opacity: 0.8, animation: "mbt-drift 13s ease-in-out infinite alternate" }}></div>

        <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 2, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "#fff", border: "3px solid #163A5F", borderRadius: "999px", padding: "7px 18px", fontWeight: 800, boxShadow: "0 4px 0 #163A5F" }}>📅 {dateStr}</div>
          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "60px", lineHeight: 1.02, margin: "18px 0 8px", color: "#fff", textShadow: "0 4px 0 rgba(22,58,95,0.35)" }}>Welcome to the Bay!</h1>
          <p style={{ fontSize: "21px", fontWeight: 700, maxWidth: "620px", margin: "0 auto", color: "#163A5F" }}>The sun is out and the sea is sparkling. Let’s see what the ocean is doing!</p>
          <div style={{ fontSize: "96px", margin: "14px 0 -8px", animation: "mbt-bob 4.5s ease-in-out infinite", display: "inline-block" }}>🦦</div>
        </div>

        <div style={{ height: "70px", margin: "0 -22px -1px", background: "repeating-linear-gradient(90deg, #3A8DDE 0 40px, #4FA0EE 40px 80px)", animation: "mbt-shimmer 3s linear infinite", borderTop: "4px solid #163A5F" }}></div>
      </div>

      {/* TODAY */}
      <div id="today" style={{ maxWidth: "1100px", margin: "0 auto", padding: "54px 22px 10px" }}>
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "38px", margin: "0 0 4px" }}>☀️ How's the Bay Today?</h2>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#4a6c8a", margin: "0 0 22px" }}>Here's what the ocean is up to right now.</p>

        {brief && (
          <p style={{ fontSize: "13px", fontWeight: 800, color: "#4a6c8a", marginBottom: "16px", textTransform: "uppercase" }}>
            ℹ️ Live Data As of {formatDate(brief.generated_at)}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "18px" }}>
          <div style={{ background: "#fff", border: "3px solid #163A5F", borderRadius: "24px", padding: "20px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)" }}>
            <div style={{ fontSize: "46px" }}>☀️</div>
            <div style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.5px", textTransform: "uppercase", color: "#4a6c8a", marginTop: "6px" }}>Sky</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "30px" }}>{airTemp}°F</div>
            <div style={{ fontWeight: 700, color: "#163A5F" }}>Sunny & bright</div>
          </div>
          <div style={{ background: "#fff", border: "3px solid #163A5F", borderRadius: "24px", padding: "20px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)" }}>
            <div style={{ fontSize: "46px" }}>🌊</div>
            <div style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.5px", textTransform: "uppercase", color: "#4a6c8a", marginTop: "6px" }}>Water</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "30px" }}>{waterTemp}°F</div>
            <div style={{ fontWeight: 700, color: "#163A5F" }}>Brrr — wetsuit weather!</div>
          </div>
          <div style={{ background: "#fff", border: "3px solid #163A5F", borderRadius: "24px", padding: "20px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)" }}>
            <div style={{ fontSize: "46px" }}>🏄</div>
            <div style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.5px", textTransform: "uppercase", color: "#4a6c8a", marginTop: "6px" }}>Waves</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "30px" }}>{waveHeight} ft</div>
            <div style={{ fontWeight: 700, color: "#163A5F" }}>Small & playful</div>
          </div>
          <div style={{ background: "#fff", border: "3px solid #163A5F", borderRadius: "24px", padding: "20px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)" }}>
            <div style={{ fontSize: "46px" }}>💨</div>
            <div style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.5px", textTransform: "uppercase", color: "#4a6c8a", marginTop: "6px" }}>Wind</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "30px" }}>{windSpeed} mph</div>
            <div style={{ fontWeight: 700, color: "#163A5F" }}>A gentle ocean breeze</div>
          </div>
        </div>

        <div style={{ marginTop: "18px", background: "linear-gradient(120deg, #3A8DDE, #2FB6A8)", border: "3px solid #163A5F", borderRadius: "24px", padding: "22px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", color: "#fff", display: "grid", gridTemplateColumns: "auto 1fr", gap: "22px", alignItems: "center" }}>
          <div style={{ position: "relative", width: "110px", height: "110px", borderRadius: "50%", border: "4px solid #fff", overflow: "hidden", background: "#cfeeff", flex: "none" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "64%", background: "repeating-linear-gradient(90deg, #1f6fd0 0 22px, #2f86e6 22px 44px)", animation: "mbt-shimmer 2.5s linear infinite", transition: "height 0.6s ease" }}></div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>🌙</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "15px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>Tide Right Now</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "30px", margin: "2px 0 4px" }}>{tideState}</div>
            <div style={{ fontWeight: 700, fontSize: "17px" }}>The water is climbing up the beach. High tide is at 2:40 PM today.</div>
            <div style={{ display: "inline-block", marginTop: "10px", background: "#FFD23F", color: "#163A5F", fontWeight: 800, padding: "7px 14px", borderRadius: "999px", border: "2px solid #163A5F" }}>🐚 Best tide-pool time today: 11:10 AM</div>
          </div>
        </div>
      </div>

      {/* MAP */}
      <div id="map" style={{ maxWidth: "1100px", margin: "0 auto", padding: "50px 22px 10px" }}>
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "38px", margin: "0 0 4px" }}>🗺️ Cool Spots in the Bay</h2>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#4a6c8a", margin: "0 0 22px" }}>Tap a pin to find out what's there!</p>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "22px", alignItems: "stretch" }}>
          <div style={{ position: "relative", minHeight: "420px", border: "3px solid #163A5F", borderRadius: "24px", overflow: "hidden", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", background: "linear-gradient(180deg, #8FE0F0, #3A8DDE)" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(115deg, rgba(255,255,255,0.10) 0 18px, transparent 18px 40px)" }}></div>
            <div style={{ position: "absolute", left: "-8%", bottom: "-10%", width: "58%", height: "75%", background: "#F4D9A0", border: "3px solid #163A5F", borderRadius: "50% 60% 40% 50%", transform: "rotate(-8deg)" }}></div>
            <div style={{ position: "absolute", right: "-14%", top: "-12%", width: "46%", height: "50%", background: "#F4D9A0", border: "3px solid #163A5F", borderRadius: "50%", transform: "rotate(10deg)" }}></div>
            <div style={{ position: "absolute", left: "6%", bottom: "8%", fontWeight: 800, color: "#9a7b3f", transform: "rotate(-8deg)", fontSize: "14px" }}>MONTEREY</div>

            {spots.map((spot, i) => (
              <button key={i} onClick={() => setSpotIdx(i)} style={{ position: "absolute", left: `${spot.x}%`, top: `${spot.y}%`, transform: "translate(-50%, -100%)", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
                <div style={{ fontSize: "12px", fontWeight: 800, background: spot.chipBg, color: "#163A5F", padding: "3px 8px", borderRadius: "999px", border: "2px solid #163A5F", whiteSpace: "nowrap", marginBottom: "3px", boxShadow: "0 2px 0 #163A5F" }}>{spot.name}</div>
                <div style={{ width: i === spotIdx ? "54px" : "42px", height: i === spotIdx ? "54px" : "42px", borderRadius: "50%", background: "#fff", border: "3px solid #163A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: i === spotIdx ? "28px" : "22px", boxShadow: "0 4px 0 rgba(22,58,95,0.3)", transition: "all 0.2s" }}>{spot.emoji}</div>
              </button>
            ))}
          </div>

          <div style={{ background: "#fff", border: "3px solid #163A5F", borderRadius: "24px", padding: "24px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "64px", lineHeight: 1 }}>{activeSpot.emoji}</div>
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "28px", margin: "12px 0 6px" }}>{activeSpot.name}</h3>
            <p style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 14px", color: "#2c4d6b" }}>{activeSpot.blurb}</p>
            <div style={{ background: "#EAF7F4", border: "2px dashed #2FB6A8", borderRadius: "16px", padding: "12px 14px", fontWeight: 800, color: "#1d7e72" }}>💡 {activeSpot.fact}</div>
          </div>
        </div>
      </div>

      {/* TIDE POOLS */}
      <div id="tidepool" style={{ maxWidth: "1100px", margin: "0 auto", padding: "50px 22px 10px" }}>
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "38px", margin: "0 0 4px" }}>🦀 Tide Pool Explorer</h2>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#4a6c8a", margin: "0 0 22px" }}>When the tide goes out, little ocean creatures get left behind in rocky pools. Tap one to meet it!</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "22px" }}>
          <div style={{ position: "relative", minHeight: "320px", border: "3px solid #163A5F", borderRadius: "24px", background: "radial-gradient(circle at 50% 30%, #6FC9DA, #2FB6A8)", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", padding: "16px", display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "12px" }}>
            {creatures.map((c, i) => (
              <button key={i} onClick={() => setCreatureIdx(i)} style={{ background: "#fff", border: "3px solid #163A5F", borderRadius: "18px", width: "86px", height: "86px", cursor: "pointer", fontSize: "40px", boxShadow: "0 4px 0 rgba(22,58,95,0.3)", transition: "transform 0.15s", animation: `mbt-sway ${c.swaySpeed} ease-in-out infinite` }}>{c.emoji}</button>
            ))}
          </div>

          <div style={{ background: "#FFF6E6", border: "3px solid #163A5F", borderRadius: "24px", padding: "24px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ fontSize: "62px", lineHeight: 1 }}>{activeCreature.emoji}</div>
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "28px", margin: 0 }}>{activeCreature.name}</h3>
                <div style={{ display: "inline-block", background: "#FF9F8E", border: "2px solid #163A5F", color: "#163A5F", fontWeight: 800, fontSize: "13px", padding: "3px 10px", borderRadius: "999px", marginTop: "4px" }}>{activeCreature.tag}</div>
              </div>
            </div>
            <p style={{ fontSize: "19px", fontWeight: 700, lineHeight: 1.45, margin: "16px 0 0", color: "#2c4d6b" }}>{activeCreature.fact}</p>
            <div style={{ marginTop: "16px", background: "#fff", border: "2px dashed #FF9F8E", borderRadius: "16px", padding: "12px 14px", fontWeight: 800, color: "#c8553d" }}>🔎 Look for me: {activeCreature.find}</div>
          </div>
        </div>
      </div>

      {/* SEA LIFE */}
      <div id="sealife" style={{ maxWidth: "1100px", margin: "0 auto", padding: "50px 22px 20px" }}>
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "38px", margin: "0 0 4px" }}>🐋 Meet the Sea Life</h2>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#4a6c8a", margin: "0 0 22px" }}>Tap a card to flip it and learn a wild fact!</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "18px" }}>
          {facts.map((f, i) => (
            <div key={i} onClick={() => toggleFlip(i)} style={{ perspective: "1000px", height: "240px", cursor: "pointer" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", transition: "transform 0.6s", transformStyle: "preserve-3d", transform: flippedCards[i] ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                {/* front */}
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: f.bg, border: "3px solid #163A5F", borderRadius: "24px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                  <div style={{ fontSize: "74px" }}>{f.emoji}</div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "24px", marginTop: "8px", color: "#163A5F" }}>{f.name}</div>
                  <div style={{ fontWeight: 800, fontSize: "13px", color: "#163A5F", opacity: 0.7, marginTop: "4px" }}>tap to flip ↻</div>
                </div>
                {/* back */}
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "#163A5F", color: "#fff", border: "3px solid #163A5F", borderRadius: "24px", boxShadow: "0 8px 0 rgba(22,58,95,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: "34px" }}>{f.emoji}</div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "19px", margin: "6px 0" }}>{f.name}</div>
                  <p style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.4, margin: 0 }}>{f.fact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: "#163A5F", color: "#fff", textAlign: "center", padding: "30px 22px", marginTop: "30px", borderTop: "5px solid #FFD23F" }}>
        <div style={{ fontSize: "40px" }}>🌊🦦🐚</div>
        <p style={{ fontWeight: 800, fontSize: "17px", margin: "10px 0 4px" }}>Monterey Bay Today — your daily window on the ocean.</p>
        <p style={{ fontWeight: 700, fontSize: "14px", opacity: 0.7, margin: 0 }}>Always explore tide pools with a grown-up, and put every creature back where you found it. 💙</p>
      </div>

    </div>
  );
}
