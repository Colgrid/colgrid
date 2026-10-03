import { submitLead } from "@/app/leads/actions";
import { turnstileSiteKey } from "@/lib/turnstile";

// One form, a few flavors. `challenge` is the home-page version of the corporate form: it asks about
// the goal instead of group size, and is stored as a corporate lead marked "Challenge inquiry".
// One form, two flavors. Big fields and labels above inputs: most people fill this in on a phone.
export default function LeadForm({ kind, challenge = false }: { kind: "corporate" | "host" | "contact"; challenge?: boolean }) {
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
          {challenge ? "Organization" : corporate ? "Company" : "Business name"}
          <input name="organization" maxLength={160} autoComplete="organization" required={!corporate || challenge} />
        </label>
      )}
      {contact ? null : challenge ? (
        <>
          <label>
            Neighborhood or location
            <input name="location" maxLength={160} placeholder="e.g. Sugar House" />
          </label>
          <label>
            Target timeline
            <input name="preferred_dates" maxLength={200} placeholder="e.g. this spring" />
          </label>
        </>
      ) : corporate ? (
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
        {contact ? "Your message" : challenge ? "Primary objective" : corporate ? "Anything we should know?" : "What could a team make, taste or discover with you?"}
        <textarea
          name="message"
          rows={contact ? 5 : 3}
          maxLength={2000}
          required={contact || challenge}
          placeholder={contact ? "Questions about playing, accessibility, press…" : challenge ? "e.g. audit every crosswalk within a mile of the school" : corporate ? "Offsite, onboarding, a celebration…" : "e.g. a 15-minute glaze challenge"}
        />
      </label>
      {turnstileSiteKey && (
        <>
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="dark" data-size="flexible" />
        </>
      )}
      <button type="submit" className="button button--primary">
        {contact ? "Send" : challenge ? "Commission a challenge" : corporate ? "Get a quote" : "Get in touch"}
      </button>
    </form>
  );
}
