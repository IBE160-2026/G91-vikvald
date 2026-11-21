import { cn } from "@/lib/utils";
import { subjectColorClass } from "@/lib/subject-colors";

// The subject dot (DESIGN.md "Emnefarger"): an 8 px circle in the subject's colour.
// It is decoration: the name always stands next to it, so screen readers skip it.
export function SubjectDot({ colorIndex, className }: { colorIndex: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-color-index={colorIndex}
      className={cn("inline-block size-[8px] shrink-0 rounded-full", subjectColorClass(colorIndex), className)}
    />
  );
}
