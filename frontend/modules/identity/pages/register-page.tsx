"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { iconProps } from "@/components/icon";
import { PasswordField } from "@/components/password-field";
import { TextField } from "@/components/text-field";
import { ApiError } from "@/lib/api";
import { messageFor } from "@/lib/messages";

import { registerUser } from "../api";
import { AuthCard } from "../components/auth-card";
import type { RegisterInput } from "../types";
import {
  fieldForErrorCode,
  registerErrorCodes,
  registerSchema,
  type FieldErrorCodes,
  type RegisterField,
} from "../validation";

const FIELD_ORDER: RegisterField[] = ["email", "password"];

// «Opprett konto» (a variant of mockup 01), with a link back to «Logg inn».
// zod checks the input before the call; errors from the API are shown under the
// field they belong to, anything else in an alert above the button. Focus moves
// to the first field with an error.
export function RegisterPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrorCodes>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Blocks a second submit while the request runs, and after success while the
  // page navigates (a second POST would get 409 for the account just made).
  // A ref is read at once; the state only drives aria-disabled.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // Focus is moved after the error is rendered, so a screen reader reads it with the field.
  const [focusRequest, setFocusRequest] = useState<{ field: RegisterField } | null>(null);

  useEffect(() => {
    if (!focusRequest) return;
    (focusRequest.field === "email" ? emailRef : passwordRef).current?.focus();
  }, [focusRequest]);

  const mutation = useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
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
    const codes = registerErrorCodes({ email, password });
    if (codes) {
      setFieldErrors(codes);
      const first = FIELD_ORDER.find((field) => codes[field]);
      if (first) setFocusRequest({ field: first });
      return;
    }
    setFieldErrors({});
    // Send what zod checked: the e-mail trimmed and in lower case, the password as typed.
    submittingRef.current = true;
    setSubmitting(true);
    mutation.mutate(registerSchema.parse({ email, password }));
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
    <AuthCard title="Opprett konto" footer={{ text: "Har du konto?", linkText: "Logg inn", href: "/logg-inn" }}>
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
            setFormError(null);
          }}
          error={errorText("email")}
        />
        <PasswordField
          ref={passwordRef}
          label="Passord"
          name="password"
          autoComplete="new-password"
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
          Opprett konto
        </Button>
      </form>
    </AuthCard>
  );
}
