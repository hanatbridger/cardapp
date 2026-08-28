import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

const APP_STORE =
  'https://apps.apple.com/us/app/cardpulse-card-tracker/id6762569336';

/* The watchlist, drawn in CSS. Real cards and real numbers from the app
   rather than lorem — the whole pitch is that the numbers are real. */
function Phone() {
  return (
    <div className="phone" role="img" aria-label="The CardPulse watchlist showing two tracked cards with current prices">
      <div className="bar">
        <span>9:41</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <BrandMark size={11} /> CardPulse
        </span>
      </div>
      <div className="title">2 cards tracked</div>
      <div className="row">
        <img className="art" src="/cards/charizard.png" alt="" />
        <div>
          <div className="name">Charizard ex</div>
          <div className="set">151 &middot; Special Illustration Rare</div>
        </div>
        <div>
          <div className="money">$361.45</div>
          <div className="delta up">&#9650; 2.4%</div>
        </div>
      </div>
      <div className="row">
        <img className="art" src="/cards/umbreon.png" alt="" />
        <div>
          <div className="name">Umbreon ex</div>
          <div className="set">Prismatic Evolutions</div>
        </div>
        <div>
          <div className="money">$1,350</div>
          <div className="delta up">&#9650; 3.9%</div>
        </div>
      </div>
      <div className="row">
        <img className="art" src="/cards/latias.png" alt="" />
        <div>
          <div className="name">Latias &#9733;</div>
          <div className="set">EX Deoxys &middot; Gold Star</div>
        </div>
        <div>
          <div className="money">$1,500</div>
          <div className="delta down">&#9660; 1.1%</div>
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
          <h1>Know what your cards are worth.</h1>
          <p className="sub">One list. Live prices. A push when a card hits your price.</p>
          <div className="actions">
            <a className="cta" href={APP_STORE}>Download on the App Store</a>
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
        <div className="notif">
          <div className="glyph" />
          <div>
            <div className="t">CardPulse</div>
            <div className="b">Moonbreon is now below $420 &mdash; currently $418.50.</div>
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
          <p className="say">
            Every price says where it came from.{' '}
            <Link href="/methodology">See the sources</Link>
          </p>
        </div>
        <div className="stack">
          <div className="notif">
            <div className="glyph" />
            <div>
              <div className="t">$361.45</div>
              <div className="b">TCGplayer market price &middot; raw &middot; updated today</div>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div>
          <h2>Free to start.</h2>
          <p className="say">
            Two caps, and a subscription that removes them.{' '}
            <Link href="/pricing">What&rsquo;s included</Link>
          </p>
        </div>
        <div className="tiers">
          <div className="tier">
            <span className="amount">Free</span>
            <span className="who">5 cards, 3 alerts</span>
          </div>
          <div className="tier">
            <span className="amount">$4.99</span>
            <span className="who">a month, no caps</span>
          </div>
        </div>
      </section>

      <section className="closer">
        <h2>Start with one card.</h2>
        <a className="cta" href={APP_STORE}>Download on the App Store</a>
      </section>
    </div>
  );
}
