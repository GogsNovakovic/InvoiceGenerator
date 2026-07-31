"use client";

import { useRef, useState } from "react";
import { RiAddLine } from "@remixicon/react";

import { ClientForm } from "@/components/clients/client-form";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { searchClients } from "@/lib/actions/clients";
import type { ClientOption } from "@/lib/data/clients";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Searchable client picker for the invoice form, with inline creation so a new
 * client does not cost the user their in-progress invoice.
 *
 * Controlled on the whole option rather than an id: the caller already needs
 * the label and email to render, so handing back the full row saves it a
 * lookup. Results come from the server on every keystroke, so the built-in
 * filtering is switched off with `filter={null}`.
 */
export function ClientCombobox({
  value,
  onChange,
  placeholder = "Search clients…",
  disabled = false,
}: {
  value: ClientOption | null;
  onChange: (client: ClientOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  async function load(query: string) {
    // Responses can land out of order; only the newest one may apply.
    const requestId = ++requestRef.current;
    const results = await searchClients(query);

    if (requestRef.current === requestId) {
      setOptions(results);
    }
  }

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      void load("");
    }
  }

  function onInputValueChange(inputValue: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void load(inputValue);
    }, SEARCH_DEBOUNCE_MS);
  }

  function onCreated(client: ClientOption) {
    setCreateOpen(false);
    setOptions((current) => [client, ...current]);
    onChange(client);
  }

  // Prefer the instance from `options` so the selected item shows its tick.
  const selected = options.find((option) => option.id === value?.id) ?? value;

  return (
    <>
      <Combobox
        items={options}
        value={selected}
        onValueChange={onChange}
        itemToStringLabel={(client: ClientOption) => client.label}
        filter={null}
        open={open}
        onOpenChange={onOpenChange}
        onInputValueChange={onInputValueChange}
        disabled={disabled}
      >
        <ComboboxInput placeholder={placeholder} disabled={disabled} showClear />
        <ComboboxContent>
          <ComboboxList>
            {options.map((client) => (
              <ComboboxItem key={client.id} value={client}>
                <span className="flex flex-col">
                  <span>{client.label}</span>
                  {client.email && (
                    <span className="text-xs text-muted-foreground">
                      {client.email}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
          <ComboboxEmpty>No clients found.</ComboboxEmpty>
          <ComboboxSeparator />
          <div className="p-1.5">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            >
              <RiAddLine data-icon="inline-start" />
              New client
            </Button>
          </div>
        </ComboboxContent>
      </Combobox>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>
              This client is selected for the invoice as soon as you create it.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            onSuccess={onCreated}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
