import { CHALLENGE } from "@/lib/site";

// The sample Outcome Report, shown on the home page and on /how-it-works. The numbers are
// illustrative and the card is labeled "Sample"; swap in a real report after the first challenge.
export default function OutcomeReport() {
  const max = Math.max(...CHALLENGE.sample.stops.map((s) => s.visits));
  return (
    <div className="report">
      <div className="report__head">
        <span>Outcome Report</span>
        <span className="report__tag">Sample</span>
      </div>
      <dl className="report__stats">
        {CHALLENGE.sample.stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.n}</dd>
          </div>
        ))}
      </dl>
      <p className="report__sub">{CHALLENGE.sample.barsLabel}</p>
      <ul className="report__bars" aria-label={CHALLENGE.sample.barsLabel}>
        {CHALLENGE.sample.stops.map((s) => (
          <li key={s.name}>
            <span>{s.name}</span>
            <span>
              <i style={{ width: `${Math.round((s.visits / max) * 100)}%` }} />
            </span>
            <span>{s.visits}</span>
          </li>
        ))}
      </ul>
      <p className="report__quote">{CHALLENGE.sample.quote}</p>
    </div>
  );
}
