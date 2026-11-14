"use client";

import { useActionState } from "react";
import { login, setup, type AuthFormState } from "@/admin/auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, {});
  return (
    <form action={action} className="adm-form">
      <div className="adm-field">
        <label htmlFor="password">Password</label>
        <input
          className="adm-input" id="password" name="password" type="password" autoComplete="current-password" required
          aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "auth-error" : undefined}
        />
        {state.error ? <p className="adm-error" id="auth-error" role="alert">{state.error}</p> : null}
      </div>
      <div className="adm-actions">
        <button className="btn btn-ink" type="submit" disabled={pending}>{pending ? "Signing in" : "Sign in"}</button>
      </div>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(setup, {});
  return (
    <form action={action} className="adm-form">
      <div className="adm-field">
        <label htmlFor="password">Password</label>
        <input className="adm-input" id="password" name="password" type="password" autoComplete="new-password" required aria-describedby="password-help" />
        <p className="adm-help" id="password-help">At least 12 characters. A short sentence works well.</p>
      </div>
      <div className="adm-field">
        <label htmlFor="confirm">Repeat password</label>
        <input
          className="adm-input" id="confirm" name="confirm" type="password" autoComplete="new-password" required
          aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "auth-error" : undefined}
        />
        {state.error ? <p className="adm-error" id="auth-error" role="alert">{state.error}</p> : null}
      </div>
      <div className="adm-actions">
        <button className="btn btn-ink" type="submit" disabled={pending}>{pending ? "Saving" : "Save password"}</button>
      </div>
    </form>
  );
}
