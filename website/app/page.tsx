import { BrandMark } from '@/components/BrandMark';
import { AppStoreBadge } from '@/components/AppStoreBadge';

/* The hero device: real captures of the app (header, watchlist) layered
   with live DOM for the moving parts — the iOS status bar and the
   trending ticker, which marquees the way the in-app carousel does. */
const TICKER = [
  { art: 'charizard', name: 'Charizard ex', set: '151', delta: '+2.4%', up: true },
  { art: 'moonbreon', name: 'Umbreon VMAX', set: 'Evolving Skies', delta: '+4.1%', up: true },
  { art: 'latias', name: 'Latias \u2605', set: 'EX Deoxys', delta: '-1.1%', up: false },
  { art: 'umbreon', name: 'Umbreon ex', set: 'Prismatic Evolutions', delta: '+3.9%', up: true },
];

function TickerRun() {
  return (
    <div className="ticker-run" aria-hidden="true">
      {TICKER.map((t) => (
        <div className="ticker-tile" key={t.name}>
          <img src={`/cards/${t.art}.png`} alt="" />
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
      <div className="island" />
      <div className="screen">
        <div className="status">
          <span className="clock">9:41 &middot; Aug 27</span>
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
        <div className="stack">
          <div className="row">
            <img className="art" src="/cards/moonbreon.png" alt="" />
            <div>
              <div className="name">Moonbreon</div>
              <div className="set">Evolving Skies &middot; target $420</div>
            </div>
            <div>
              <div className="money">$438</div>
              <div className="delta down">&#9660; 4.1%</div>
            </div>
          </div>
          <p className="note">Waiting to buy. $18 to go.</p>
        </div>
      </section>

      <section className="showcase flip">
        <div>
          <h2>A push when it hits your price.</h2>
          <p className="say">Set a number. Put the phone down.</p>
        </div>
        <div className="alert-story">
          <div className="alert-mock">
            <div className="alert-head">Price alert &middot; Moonbreon</div>
            <div className="alert-line">
              <span>Price moves below</span>
              <span className="alert-amount">$420.00</span>
              <span className="switch" aria-hidden="true" />
            </div>
          </div>
          <div className="story-arrow" aria-hidden="true">&darr;</div>
          <div className="notif">
            <div className="glyph"><BrandMark size={17} variant="inverse" /></div>
            <div>
              <div className="t">CardPulse</div>
              <div className="b">Moonbreon is now below $420 &mdash; currently $418.50.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div>
          <h2>Every printing.</h2>
          <p className="say">English, Japanese, vintage and sealed, in one search.</p>
        </div>
        <div className="chips">
          <span className="chip-tag">English</span>
          <span className="chip-tag">Japanese</span>
          <span className="chip-tag">Vintage</span>
          <span className="chip-tag">Gold Star</span>
          <span className="chip-tag">Booster boxes</span>
          <span className="chip-tag">Elite Trainer Boxes</span>
          <span className="chip-tag">Tins</span>
          <span className="chip-tag">PSA 10</span>
        </div>
      </section>

      <section className="showcase flip">
        <div>
          <h2>Real numbers, named.</h2>
          <p className="say">Every price says where it came from.</p>
        </div>
        <div className="stack">
          <div className="notif">
            <div className="glyph"><BrandMark size={17} variant="inverse" /></div>
            <div>
              <div className="t">$361.45</div>
              <div className="b">TCGplayer market price &middot; raw &middot; updated today</div>
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
