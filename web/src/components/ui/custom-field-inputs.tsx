"use client";

import { Select } from "@/components/ui/select";
import type { CustomFieldDef } from "@/lib/types";

type CustomFieldInputsProps = {
  defs: CustomFieldDef[];
  values: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
};

/** Renderiza os campos personalizados configurados pela empresa em um formulário. */
export function CustomFieldInputs({ defs, values, onChange }: CustomFieldInputsProps) {
  if (defs.length === 0) return null;

  return (
    <>
      {defs.map((def) => (
        <label key={def.id} className="field">
          <span>{def.name}</span>
          {def.type === "Select" ? (
            <Select
              value={values[def.fieldKey] ?? ""}
              onChange={(value) => onChange(def.fieldKey, value)}
              placeholder="Selecionar..."
              options={[
                { value: "", label: "—" },
                ...def.options.map((option) => ({ value: option, label: option })),
              ]}
            />
          ) : (
            <input
              type={def.type === "Number" ? "number" : def.type === "Date" ? "date" : "text"}
              value={values[def.fieldKey] ?? ""}
              onChange={(event) => onChange(def.fieldKey, event.target.value)}
            />
          )}
        </label>
      ))}
    </>
  );
}
