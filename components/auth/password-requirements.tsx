"use client";

import {
  RiCheckLine,
  RiCheckboxBlankCircleLine,
  RiCloseLine,
} from "@remixicon/react";

import { passwordRules } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

type PasswordRequirementsProps = {
  /** The live password value, straight from the form. */
  value: string;
  /**
   * Only true once a submit has been attempted. Until then an unmet rule stays
   * muted rather than red — nobody should be shouted at mid-typing.
   */
  showErrors: boolean;
  /** Referenced by the input's `aria-describedby`. */
  id: string;
};

export function PasswordRequirements({
  value,
  showErrors,
  id,
}: PasswordRequirementsProps) {
  return (
    <ul id={id} className="flex flex-col gap-1.5 text-sm">
      {passwordRules.map((rule) => {
        const met = rule.test(value);
        const failed = !met && showErrors;

        const Icon = met ? RiCheckLine : failed ? RiCloseLine : RiCheckboxBlankCircleLine;

        return (
          <li
            key={rule.id}
            // The parent <Field data-invalid> sets text-destructive on every
            // descendant, so each row has to state its own colour or the whole
            // list turns red — ticks included.
            className={cn(
              "flex items-center gap-2 leading-normal",
              met
                ? "text-success"
                : failed
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span>{rule.label}</span>
            {/* State is otherwise carried only by icon and colour. */}
            <span className="sr-only">{met ? "— met" : "— not met"}</span>
          </li>
        );
      })}
    </ul>
  );
}
