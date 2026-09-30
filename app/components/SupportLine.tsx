import { SITE } from "@/lib/site";

// Game-day help: one obvious fast channel. Tap to call or text.
export default function SupportLine({ prominent = false }: { prominent?: boolean }) {
  const { label, phone, tel } = SITE.support;
  return (
    <p className={`support-line${prominent ? " support-line--live" : ""}`}>
      <span>{label}</span>{" "}
      <span className="support-line__actions">
        <a href={`tel:${tel}`} className="mono">
          {phone}
        </a>
        <a href={`sms:${tel}`}>Text</a>
      </span>
    </p>
  );
}
