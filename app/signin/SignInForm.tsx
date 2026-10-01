"use client";

import { useActionState } from "react";
import { sendMagicLink, verifyCode, type CodeState, type SignInState } from "./actions";

const initial: SignInState = { status: "idle", email: "" };

export default function SignInForm({ linkError, next }: { linkError: boolean; next: string | null }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initial);
  const [codeState, codeAction, checking] = useActionState<CodeState, FormData>(verifyCode, { error: null });

  if (state.status === "sent") {
    return (
      <div className="notice" role="status">
        <p className="notice__title">Check your email.</p>
        <p>
          Tap the link we sent to <strong>{state.email}</strong>, or enter the code from the email.
        </p>
        <form action={codeAction} className="form" style={{ marginTop: 16 }}>
          <input type="hidden" name="email" value={state.email} />
          {next && <input type="hidden" name="next" value={next} />}
          <label className="label mono" htmlFor="code">
            CODE
          </label>
          <input
            id="code"
            name="code"
            className="input input--code mono"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            placeholder="123456"
            aria-describedby={codeState.error ? "code-error" : undefined}
          />
          {codeState.error && (
            <p id="code-error" className="form__error" role="alert">
              {codeState.error}
            </p>
          )}
          <button className="button button--primary" type="submit" disabled={checking} style={{ width: "100%", marginTop: 12 }}>
            {checking ? "Checking…" : "Sign in"}
          </button>
        </form>
        <p className="notice__small">Nothing there? Check spam.</p>
        <form action={formAction}>
          <input type="hidden" name="email" value={state.email} />
          {next && <input type="hidden" name="next" value={next} />}
          <button className="button button--secondary" type="submit" disabled={pending} style={{ width: "100%", marginTop: 16 }}>
            {pending ? "Sending…" : "Send it again"}
          </button>
        </form>
      </div>
    );
  }

  const message = state.status === "error" ? state.message : linkError ? "That link expired. Send a new one." : null;

  return (
    <form action={formAction} className="form">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="label mono" htmlFor="email">
        EMAIL
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.email}
        placeholder="you@example.com"
        className="input"
        aria-describedby={message ? "signin-error" : undefined}
      />
      {message && (
        <p id="signin-error" className="form__error" role="alert">
          {message}
        </p>
      )}
      <button className="button button--primary" type="submit" disabled={pending} style={{ width: "100%", marginTop: 16 }}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
