import { addPlayer } from "@/app/gm/actions";

// Add one player by hand (comps, invited friends, walk-ins). Used in the admin and the game master console.
export default function AddPlayerForm({ sessionId, returnTo, className }: { sessionId: string; returnTo: string; className: string }) {
  return (
    <form action={addPlayer} className={className}>
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input name="name" placeholder="Name" aria-label="Name" maxLength={120} />
      <input name="email" type="email" placeholder="Email" aria-label="Email" required maxLength={254} />
      <select name="coming_with" defaultValue="" aria-label="Who are they coming with?">
        <option value="">Coming with…</option>
        <option value="friends">Friends</option>
        <option value="partner">Partner</option>
        <option value="family">Family</option>
        <option value="coworkers">Coworkers</option>
        <option value="solo">Solo</option>
        <option value="other">Other</option>
      </select>
      <button type="submit" className="button button--primary">
        Add player
      </button>
    </form>
  );
}
