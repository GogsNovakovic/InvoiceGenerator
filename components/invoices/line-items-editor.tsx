"use client";

import { useState } from "react";
import {
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { RiAddLine, RiCloseLine, RiDeleteBinLine } from "@remixicon/react";

import type { Currency } from "@/lib/currency";
import { lineSubtotalCents, parseFormLine } from "@/lib/invoice-totals";
import { formatCentsPlain } from "@/lib/money";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

/**
 * The line item editor.
 *
 * One layout, two shapes: below `md` each row is a labelled card, at `md` and
 * up the same grid lines the fields up under a header row, so a twenty-line
 * invoice is still scannable on a laptop and still usable on a phone
 * (docs/PRD.md §16).
 */

export const VAT_PRESETS = ["0", "17", "21"] as const;

export const EMPTY_LINE: InvoiceFormValues["line_items"][number] = {
  description: "",
  unit_type: "hours",
  quantity: "1",
  unit_price: "",
  vat_rate: "21",
};

/** The same column track for the header and every row, so they stay aligned. */
const GRID =
  "grid gap-3 md:grid-cols-[minmax(0,1fr)_6.5rem_8rem_8rem_7rem_2.25rem] md:items-start md:gap-2";

export function LineItemsEditor({
  form,
  currency,
}: {
  form: UseFormReturn<InvoiceFormValues>;
  currency: Currency;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  });

  // Which rows show a free-text VAT box instead of the preset list. Seeded
  // from the values themselves, so editing an invoice billed at 8.5 % opens
  // with that row already in custom mode.
  const [customVat, setCustomVat] = useState<boolean[]>(() =>
    (form.getValues("line_items") ?? []).map(
      (line) => !VAT_PRESETS.includes(line.vat_rate as (typeof VAT_PRESETS)[number]),
    ),
  );

  // See the note in invoice-form.tsx: `useWatch` keeps this component
  // memoizable, `form.watch` would not.
  const lines = useWatch({ control: form.control, name: "line_items" }) ?? [];
  const errors = form.formState.errors.line_items;

  function setRowCustomVat(index: number, isCustom: boolean) {
    setCustomVat((current) => {
      const next = [...current];
      next[index] = isCustom;
      return next;
    });
  }

  function addRow() {
    append(EMPTY_LINE);
    setCustomVat((current) => [...current, false]);
  }

  function removeRow(index: number) {
    remove(index);
    setCustomVat((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`${GRID} hidden border-b pb-2 text-xs font-medium text-muted-foreground md:grid`}
      >
        <span>Description</span>
        <span>Unit</span>
        <span>Quantity</span>
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="sr-only">Remove</span>
      </div>

      {fields.map((field, index) => {
        const line = lines[index];
        const rowErrors = errors?.[index];
        const isFlat = line?.unit_type === "flat";
        const parsed = line ? parseFormLine(line) : null;
        const isCustom = customVat[index] ?? false;

        return (
          <div
            key={field.id}
            className={`${GRID} rounded-2xl border p-3 md:rounded-none md:border-0 md:border-b md:p-0 md:pb-3`}
          >
            <Field data-invalid={Boolean(rowErrors?.description)}>
              <FieldLabel
                htmlFor={`line-${index}-description`}
                className="md:sr-only"
              >
                Description
              </FieldLabel>
              <Input
                id={`line-${index}-description`}
                placeholder="What are you billing for?"
                aria-invalid={Boolean(rowErrors?.description)}
                {...form.register(`line_items.${index}.description`)}
              />
              <FieldError errors={[rowErrors?.description]} />
            </Field>

            <Field>
              <FieldLabel
                htmlFor={`line-${index}-unit`}
                className="md:sr-only"
              >
                Unit
              </FieldLabel>
              <NativeSelect
                id={`line-${index}-unit`}
                className="w-full"
                {...form.register(`line_items.${index}.unit_type`, {
                  // `flat` means the price is the whole fee, so quantity is
                  // pinned to 1 — the same rule the database enforces with
                  // `line_items_flat_quantity` (docs/DB.md §4.5).
                  onChange: (event) => {
                    if (event.target.value === "flat") {
                      form.setValue(`line_items.${index}.quantity`, "1");
                    }
                  },
                })}
              >
                <NativeSelectOption value="hours">hours</NativeSelectOption>
                <NativeSelectOption value="flat">flat</NativeSelectOption>
              </NativeSelect>
            </Field>

            <Field data-invalid={Boolean(rowErrors?.quantity)}>
              <FieldLabel
                htmlFor={`line-${index}-quantity`}
                className="md:sr-only"
              >
                Quantity
              </FieldLabel>
              <Input
                id={`line-${index}-quantity`}
                inputMode="decimal"
                autoComplete="off"
                disabled={isFlat}
                aria-invalid={Boolean(rowErrors?.quantity)}
                {...form.register(`line_items.${index}.quantity`)}
              />
              <FieldError errors={[rowErrors?.quantity]} />
            </Field>

            <Field data-invalid={Boolean(rowErrors?.unit_price)}>
              <FieldLabel
                htmlFor={`line-${index}-price`}
                className="md:sr-only"
              >
                Price ({currency})
              </FieldLabel>
              <Input
                id={`line-${index}-price`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                aria-invalid={Boolean(rowErrors?.unit_price)}
                {...form.register(`line_items.${index}.unit_price`)}
              />
              <FieldError errors={[rowErrors?.unit_price]} />
            </Field>

            <Field data-invalid={Boolean(rowErrors?.vat_rate)}>
              <FieldLabel
                htmlFor={`line-${index}-vat`}
                className="md:sr-only"
              >
                VAT rate
              </FieldLabel>
              <div className="flex items-center gap-1.5 md:justify-end">
                {isCustom ? (
                  <Input
                    id={`line-${index}-vat`}
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    className="w-20"
                    aria-label="Custom VAT rate in percent"
                    aria-invalid={Boolean(rowErrors?.vat_rate)}
                    {...form.register(`line_items.${index}.vat_rate`)}
                  />
                ) : (
                  <NativeSelect
                    id={`line-${index}-vat`}
                    size="sm"
                    aria-label="VAT rate"
                    value={line?.vat_rate ?? "0"}
                    onChange={(event) => {
                      if (event.target.value === "custom") {
                        setRowCustomVat(index, true);
                        form.setValue(`line_items.${index}.vat_rate`, "");
                        return;
                      }

                      form.setValue(
                        `line_items.${index}.vat_rate`,
                        event.target.value,
                      );
                    }}
                  >
                    {VAT_PRESETS.map((preset) => (
                      <NativeSelectOption key={preset} value={preset}>
                        {preset} %
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value="custom">
                      Custom…
                    </NativeSelectOption>
                  </NativeSelect>
                )}
                {isCustom && (
                  <>
                    <span className="text-sm text-muted-foreground">%</span>
                    {/* Without this, choosing "Custom…" replaces the select for
                        good and there is no way back to the presets. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Use a preset VAT rate on line ${index + 1}`}
                      onClick={() => {
                        setRowCustomVat(index, false);
                        form.setValue(
                          `line_items.${index}.vat_rate`,
                          VAT_PRESETS[0],
                        );
                      }}
                    >
                      <RiCloseLine />
                    </Button>
                  </>
                )}
              </div>
              <FieldError errors={[rowErrors?.vat_rate]} />
            </Field>

            <div className="flex items-center justify-between gap-2 md:mt-1.5 md:block">
              <span className="text-sm text-muted-foreground md:hidden">
                Amount
              </span>
              <span className="text-sm font-medium tabular-nums md:block md:text-right">
                {parsed ? formatCentsPlain(lineSubtotalCents(parsed)) : "—"}
              </span>
            </div>

            <div className="md:mt-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove line ${index + 1}`}
                disabled={fields.length === 1}
                onClick={() => removeRow(index)}
              >
                <RiDeleteBinLine />
              </Button>
            </div>
          </div>
        );
      })}

      <div>
        <Button type="button" variant="outline" onClick={addRow}>
          <RiAddLine data-icon="inline-start" />
          Add line
        </Button>
      </div>
    </div>
  );
}
