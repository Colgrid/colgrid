import { submitLead } from "@/app/leads/actions";

// One form, two flavors. Big fields and labels above inputs: most people fill this in on a phone.
export default function LeadForm({ kind }: { kind: "corporate" | "host" | "contact" }) {
  const corporate = kind === "corporate";
  const contact = kind === "contact";
  return (
    <form action={submitLead} className="lead-form">
      <input type="hidden" name="kind" value={kind} />
      <div className="lead-form__trap" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label>
        Your name
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>
      {!contact && (
        <label>
          {corporate ? "Company" : "Business name"}
          <input name="organization" maxLength={160} autoComplete="organization" required={!corporate} />
        </label>
      )}
      {contact ? null : corporate ? (
        <>
          <label>
            How many players?
            <input name="group_size" type="number" min={1} max={1000} inputMode="numeric" placeholder="e.g. 20" />
          </label>
          <label>
            Dates you&apos;re thinking about
            <input name="preferred_dates" maxLength={200} placeholder="e.g. a Friday afternoon in November" />
          </label>
        </>
      ) : (
        <label>
          Phone (optional)
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
      )}
      <label>
        {contact ? "Your message" : corporate ? "Anything we should know?" : "What could a team make, taste or discover with you?"}
        <textarea
          name="message"
          rows={contact ? 5 : 3}
          maxLength={2000}
          required={contact}
          placeholder={contact ? "Questions about a ticket, accessibility, press…" : corporate ? "Offsite, onboarding, a celebration…" : "e.g. a 15-minute glaze challenge"}
        />
      </label>
      <button type="submit" className="button button--primary">
        {contact ? "Send" : corporate ? "Get a quote" : "Become a host"}
      </button>
    </form>
  );
}
