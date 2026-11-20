"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

import { iconProps } from "./icon";
import { TextField, type TextFieldProps } from "./text-field";
import { Button } from "./ui/button";

// Password field: a text-field with the text button «Vis» (Button variant
// "text") inside it. The button shows the password and says whether it is
// shown with aria-pressed.
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
          <Button
            variant="text"
            aria-pressed={visible}
            onClick={() => setVisible((shown) => !shown)}
            className="gap-1 text-meta-strong"
          >
            <Icon {...iconProps} />
            Vis
          </Button>
        }
      />
    );
  },
);
