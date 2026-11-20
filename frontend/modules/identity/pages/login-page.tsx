"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleAlert, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { iconProps } from "@/components/icon";
import { PasswordField } from "@/components/password-field";
import { TextField } from "@/components/text-field";
import { ApiError } from "@/lib/api";
import { messageFor } from "@/lib/messages";
import { takeSessionExpired } from "@/lib/session";

import { loginUser } from "../api";
import { AuthCard } from "../components/auth-card";
import type { LoginInput } from "../types";
import {
  fieldForErrorCode,
  loginErrorCodes,
  loginSchema,
  type FieldErrorCodes,
  type RegisterField,
} from "../validation";

// «Logg inn» (mockup 01). zod only checks the e-mail format before the call.
// Wrong e-mail or password (401 from the API) is shown under the password field,
// with focus there; anything else in an alert above the button. The same
// pattern as the register page.
export function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrorCodes>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Blocks a second submit while the request runs, and after success while the
  // page navigates. A ref is read at once; the state only drives aria-disabled.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // Focus is moved after the error is rendered, so a screen reader reads it with the field.
  const [focusRequest, setFocusRequest] = useState<{ field: RegisterField } | null>(null);

  // «Du er logget ut» only when the login ran out in this tab (lib/session.ts).
  // Read after mounting, because sessionStorage does not exist on the server.
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    if (takeSessionExpired()) setSessionExpired(true);
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    (focusRequest.field === "email" ? emailRef : passwordRef).current?.focus();
  }, [focusRequest]);

  const mutation = useMutation({
    mutationFn: (input: LoginInput) => loginUser(input),
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      submittingRef.current = false;
      setSubmitting(false);
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      const field = fieldForErrorCode(code);
      if (field) {
        setFieldErrors({ [field]: code });
        setFocusRequest({ field });
      } else {
        setFormError(messageFor(code));
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError(null);
    const codes = loginErrorCodes({ email, password });
    if (codes?.email) {
      setFieldErrors(codes);
      setFocusRequest({ field: "email" });
      return;
    }
    setFieldErrors({});
    // Send the e-mail trimmed and in lower case, the password exactly as typed.
    submittingRef.current = true;
    setSubmitting(true);
    mutation.mutate(loginSchema.parse({ email, password }));
  }

  // Editing a field hides its old message; the next submit checks it again.
  function clearFieldError(field: RegisterField) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function errorText(field: RegisterField): string | undefined {
    const code = fieldErrors[field];
    return code ? messageFor(code) : undefined;
  }

  return (
    <AuthCard title="Logg inn" footer={{ text: "Ny her?", linkText: "Opprett konto", href: "/registrer" }}>
      {/* Always in the page, so screen readers announce the text when it appears. */}
      <div role="status">
        {sessionExpired ? (
          <p className="mt-5 flex items-start gap-2 rounded-option bg-surface-note p-3 text-meta text-ink-muted">
            <Info {...iconProps} className="mt-[3px] shrink-0" />
            <span>{messageFor("UNAUTHENTICATED")}</span>
          </p>
        ) : null}
      </div>
      <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <TextField
          ref={emailRef}
          label="E-post"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError("email");
            // «Feil e-post eller passord» may be about the e-mail, so it goes too.
            setFieldErrors((current) =>
              current.password === "INVALID_CREDENTIALS" ? { ...current, password: undefined } : current,
            );
            setFormError(null);
          }}
          error={errorText("email")}
        />
        <PasswordField
          ref={passwordRef}
          label="Passord"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearFieldError("password");
            setFormError(null);
          }}
          error={errorText("password")}
        />

        {formError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{formError}</span>
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-3 w-full" aria-disabled={submitting || undefined}>
          Logg inn
        </Button>
      </form>
    </AuthCard>
  );
}
