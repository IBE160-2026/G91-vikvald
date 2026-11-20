"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

import { iconProps } from "./icon";
import { TextField, type TextFieldProps } from "./text-field";

// Password field: a text-field with the text button «Vis» inside it. The button
// shows the password and says whether it is shown with aria-pressed.
export type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailing">;

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    const Icon = visible ? EyeOff : Eye;
    return (
      <TextField
        ref={ref}
        {...props}
        type={visible ? "text" : "password"}
        trailing={
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((shown) => !shown)}
            className="inline-flex h-button-height cursor-pointer items-center gap-1 rounded-md px-2 text-meta-strong text-brand hover:bg-brand-tint"
          >
            <Icon {...iconProps} />
            Vis
          </button>
        }
      />
    );
  },
);
