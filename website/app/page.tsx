import { BrandMark } from '@/components/BrandMark';
import { AppStoreBadge } from '@/components/AppStoreBadge';

/* The watchlist, drawn in CSS. Real cards and real numbers from the app
   rather than lorem — the whole pitch is that the numbers are real. */
function Phone() {
  return (
    <div className="phone" role="img" aria-label="The CardPulse watchlist showing two tracked cards with current prices">
      <div className="island" />
      <div className="screen">
        <img
          className="screen-shot"
          src="/screens/home.webp"
          alt="The CardPulse home screen: two tracked cards with live prices and the trending rail"
        />
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
