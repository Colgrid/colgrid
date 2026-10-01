import { SITE } from "@/lib/site";

// Game-day help, kept small: it's there when you need it, it doesn't compete with the mission.
export default function SupportLine() {
  const { phone, tel } = SITE.support;
  return (
    <p className="support-line">
      Need help? <a href={`tel:${tel}`}>Call</a> or <a href={`sms:${tel}`}>text</a>{" "}
      <a href={`tel:${tel}`} className="mono support-line__num">
        {phone}
      </a>
    </p>
  );
}
