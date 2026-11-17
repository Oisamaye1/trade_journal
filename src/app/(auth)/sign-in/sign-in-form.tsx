"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInWithEmail, signInWithGoogle, type EmailSignInState } from "@/server/actions/auth";

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const INITIAL: EmailSignInState = { status: "idle" };

export function SignInForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, emailAction, pending] = useActionState(signInWithEmail, INITIAL);

  if (state.status === "sent") {
    return (
      <div role="status" className="grid justify-items-center gap-3 py-4 text-center">
        <MailCheck aria-hidden className="size-8 text-profit" />
        <h2 className="font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong className="text-foreground">{state.email}</strong>. It
          expires in one hour.
        </p>
      </div>
    );
  }

  const fieldError = state.status === "error" ? state.message : null;

  return (
    <div className="grid gap-5">
      {initialError && state.status === "idle" ? (
        <p role="alert" className="rounded-md bg-loss-soft px-3 py-2 text-sm text-loss">
          {initialError}
        </p>
      ) : null}

      <form
        action={(formData) => {
          formData.set("tz", browserTimeZone());
          emailAction(formData);
        }}
        className="grid gap-4"
        noValidate
      >
        <input type="hidden" name="next" value={next} />
        <Field label="Email" error={fieldError}>
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              defaultValue={state.status === "error" ? state.email : undefined}
              placeholder="you@example.com"
            />
          )}
        </Field>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        action={(formData) => {
          formData.set("tz", browserTimeZone());
          return signInWithGoogle(formData);
        }}
      >
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
