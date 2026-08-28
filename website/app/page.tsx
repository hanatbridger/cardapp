import { BrandMark } from '@/components/BrandMark';
import { AppStoreBadge } from '@/components/AppStoreBadge';

/* The hero device: real captures of the app (header, watchlist) layered
   with live DOM for the moving parts — the iOS status bar and the
   trending ticker, which marquees the way the in-app carousel does. */
const TICKER = [
  { art: '/trend/t0.webp', name: "Greavard #70", set: "Scarlet & Violet Promo", delta: '-13.2%', up: false },
  { art: '/trend/t1.webp', name: "Philippe #110", set: "Chaos Rising", delta: '+11.8%', up: true },
  { art: '/trend/t2.webp', name: "Jamming Tower #261", set: "Ascended Heroes", delta: '+7.2%', up: true },
  { art: '/trend/t3.webp', name: "Mamoswine ex #174", set: "Journey Together", delta: '-6.2%', up: false },
  { art: '/trend/t4.webp', name: "Tool Scrapper #115", set: "Chaos Rising", delta: '-5.8%', up: false },
  { art: '/trend/t5.webp', name: "Mismagius ex #112", set: "Phantasmal Flames", delta: '-5.7%', up: false },
];

function TickerRun() {
  return (
    <div className="ticker-run" aria-hidden="true">
      {TICKER.map((t) => (
        <div className="ticker-tile" key={t.name}>
          <img src={t.art} alt="" />
          <div>
            <div className="tt-name">{t.name}</div>
            <div className="tt-set">{t.set}</div>
            <div className={t.up ? 'tt-delta up' : 'tt-delta down'}>{t.delta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Phone() {
  return (
    <div className="phone" role="img" aria-label="The CardPulse home screen: ten tracked cards with live prices and the trending ticker">
      <div className="bezel">
        <div className="island" />
        <div className="screen">
          <div className="status">
          <span className="clock">9:41</span>
          <span className="status-right">
            <svg viewBox="0 0 16 10" width="14" height="9" aria-hidden="true"><rect x="0" y="6" width="3" height="4" rx="0.8" fill="currentColor"/><rect x="4.3" y="4" width="3" height="6" rx="0.8" fill="currentColor"/><rect x="8.6" y="2" width="3" height="8" rx="0.8" fill="currentColor"/><rect x="12.9" y="0" width="3" height="10" rx="0.8" fill="currentColor" opacity="0.35"/></svg>
            <svg viewBox="0 0 16 11" width="14" height="10" aria-hidden="true"><path d="M8 9.5 L5.2 6.6 a4 4 0 0 1 5.6 0 Z M3.2 4.5 a6.8 6.8 0 0 1 9.6 0 L11.4 6 a4.8 4.8 0 0 0 -6.8 0 Z" fill="currentColor"/></svg>
            <svg viewBox="0 0 22 11" width="19" height="10" aria-hidden="true"><rect x="0.5" y="0.5" width="18" height="10" rx="2.6" fill="none" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="13" height="7" rx="1.4" fill="currentColor"/><rect x="19.6" y="3.4" width="1.8" height="4.2" rx="0.9" fill="currentColor" opacity="0.5"/></svg>
          </span>
        </div>
          <img className="slice" src="/screens/header.webp" alt="" />
          <div className="ticker">
            <TickerRun />
            <TickerRun />
          </div>
          <img className="slice" src="/screens/list.webp" alt="" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="shell">
      <section className="hero">
        <div>
          <h1>Know when a card hits your price.</h1>
          <p className="sub">One list of the cards you&rsquo;re watching. Live market prices. A push the moment your number comes up.</p>
          <div className="actions">
            <AppStoreBadge height={58} />
          </div>
        </div>
        <Phone />
      </section>

      <section className="showcase">
        <div>
          <h2>One list, not a collection.</h2>
          <p className="say">Track what you don&rsquo;t own yet.</p>
        </div>
        <div className="iso-stack" aria-hidden="true">
          <div className="iso-plane">
            <div className="iso-lift" style={{ '--z': '52px' } as React.CSSProperties}><div className="iso-bob"><div className="row iso-card">
              <img className="art" src="/cards/charizard.png" alt="" />
              <div>
                <div className="name">Charizard ex</div>
                <div className="set">151</div>
              </div>
              <div>
                <div className="money">$373.91</div>
                <div className="delta up">&#9650; 2.4%</div>
              </div>
            </div></div></div>
            <div className="iso-lift" style={{ '--z': '26px' } as React.CSSProperties}><div className="iso-bob"><div className="row iso-card">
              <img className="art" src="/cards/moonbreon.png" alt="" />
              <div>
                <div className="name">Umbreon VMAX</div>
                <div className="set">Evolving Skies</div>
              </div>
              <div>
                <div className="money">$2,380</div>
                <div className="delta up">&#9650; 4.1%</div>
              </div>
            </div></div></div>
            <div className="iso-lift" style={{ '--z': '0px' } as React.CSSProperties}><div className="iso-bob"><div className="row iso-card">
              <img className="art" src="/cards/latias.png" alt="" />
              <div>
                <div className="name">Latias &#9733;</div>
                <div className="set">EX Deoxys</div>
              </div>
              <div>
                <div className="money">$1,500</div>
                <div className="delta down">&#9660; 1.1%</div>
              </div>
            </div></div></div>
          </div>
        </div>
      </section>

      <section className="showcase flip">
        <div>
          <h2>A push when it hits your price.</h2>
          <p className="say">Set a number. Put the phone down.</p>
        </div>
        <div className="notif-stack">
          <div className="notif banner second">
            <div className="glyph"><BrandMark size={17} variant="inverse" /></div>
            <div>
              <div className="t">CardPulse</div>
              <div className="b">Latias &#9733; is now below $1,450 &mdash; currently $1,439.</div>
            </div>
          </div>
          <div className="slot-shift">
            <div className="notif banner first">
              <div className="glyph"><BrandMark size={17} variant="inverse" /></div>
              <div>
                <div className="t">CardPulse</div>
                <div className="b">Moonbreon is now below $420 &mdash; currently $418.50.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div>
          <h2>The market, measured.</h2>
          <p className="say">Active listings, sales a day, and demand pressure, from live eBay data.</p>
        </div>
        <div className="dyn-card" aria-label="Market dynamics: 34 active listings, 2.6 new per day, 3.1 sold per day, demand pressure high">
          <div className="chart-label">EBAY MARKET DYNAMICS &middot; 7D AVG</div>
          <div className="dyn-grid">
            <div><span className="dyn-val">34</span><span className="dyn-key">Active</span></div>
            <div><span className="dyn-val">2.6</span><span className="dyn-key">New/Day</span></div>
            <div><span className="dyn-val">3.1</span><span className="dyn-key">Sold/Day</span></div>
          </div>
          <div className="dyn-gauge">
            <div className="g-head"><span>Demand Pressure</span><span className="g-read up">High</span></div>
            <div className="g-track"><div className="g-fill" style={{ '--w': '78%' } as React.CSSProperties} /></div>
          </div>
          <div className="dyn-gauge">
            <div className="g-head"><span>Supply Saturation</span><span className="g-read">Low</span></div>
            <div className="g-track"><div className="g-fill dim" style={{ '--w': '31%' } as React.CSSProperties} /></div>
          </div>
        </div>
      </section>

      <section className="showcase flip">
        <div>
          <h2>Every card&rsquo;s history, charted.</h2>
          <p className="say">Daily closes for any card you open &mdash; raw and PSA&nbsp;10.</p>
        </div>
        <div className="chart-card" aria-label="Price history chart for Umbreon VMAX: rising from $1,850 to $2,380 over three months">
          <div className="chart-head">
            <div>
              <div className="chart-label">UMBREON VMAX &middot; RAW</div>
              <div className="chart-price">$2,380</div>
            </div>
            <span className="chart-delta">&#9650; 4.1%</span>
          </div>
          <svg className="chart" viewBox="0 0 320 130" aria-hidden="true">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="chart-area"
              d="M0,98 C22,92 34,96 52,88 C70,80 82,90 100,84 C118,78 132,60 150,64 C168,68 180,56 198,50 C216,44 228,58 246,48 C264,38 284,30 302,22 L320,18 L320,130 L0,130 Z"
              fill="url(#chartFill)"
            />
            <path
              className="chart-line"
              d="M0,98 C22,92 34,96 52,88 C70,80 82,90 100,84 C118,78 132,60 150,64 C168,68 180,56 198,50 C216,44 228,58 246,48 C264,38 284,30 302,22 L320,18"
              pathLength="1"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle className="chart-dot" cx="320" cy="18" r="4" fill="var(--brand)" />
          </svg>
          <div className="chart-ranges">
            <span>1W</span>
            <span>1M</span>
            <span className="on">3M</span>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div>
          <h2>Any currency.</h2>
          <p className="say">Every price converts to the one you pick, at a daily rate.</p>
        </div>
        <div className="currency-card" aria-label="The same card price shown in dollars, euros, yen and pounds">
          <div className="chart-label">UMBREON VMAX &middot; RAW</div>
          <div className="cur-roll" aria-hidden="true">
            <div className="cur-list">
              <div className="cur-line"><span className="cur-amount">$2,380</span><span className="cur-code">USD</span></div>
              <div className="cur-line"><span className="cur-amount">&euro;2,190</span><span className="cur-code">EUR</span></div>
              <div className="cur-line"><span className="cur-amount">&yen;352,000</span><span className="cur-code">JPY</span></div>
              <div className="cur-line"><span className="cur-amount">&pound;1,860</span><span className="cur-code">GBP</span></div>
              <div className="cur-line"><span className="cur-amount">$2,380</span><span className="cur-code">USD</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="closer">
        <h2>Start with one card.</h2>
        <AppStoreBadge height={58} />
      </section>
    </div>
  );
}
