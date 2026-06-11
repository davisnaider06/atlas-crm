import type { CustomFieldDef } from "@/lib/types";

/**
 * Valores de campos personalizados vivem em extraDataJson sob a chave
 * "customFields", preservando outros dados (ex.: captura pública de leads).
 */
export function readCustomFieldValues(extraDataJson?: string | null): Record<string, string> {
  if (!extraDataJson) return {};
  try {
    const parsed = JSON.parse(extraDataJson) as Record<string, unknown>;
    const values = parsed?.customFields;
    if (values && typeof values === "object" && !Array.isArray(values)) {
      return Object.fromEntries(
        Object.entries(values as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]),
      );
    }
  } catch {
    // extraDataJson pode conter payload arbitrário (ex.: captura pública) — ignora
  }
  return {};
}

export function mergeCustomFieldValues(
  extraDataJson: string | null | undefined,
  values: Record<string, string>,
): string {
  let base: Record<string, unknown> = {};
  if (extraDataJson) {
    try {
      const parsed = JSON.parse(extraDataJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        base = parsed as Record<string, unknown>;
      }
    } catch {
      // JSON inválido: substitui pelo objeto novo
    }
  }

  const clean = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  return JSON.stringify({ ...base, customFields: clean });
}

export const CUSTOM_FIELD_TYPE_OPTIONS = [
  { value: 1, label: "Texto" },
  { value: 2, label: "Número" },
  { value: 3, label: "Data" },
  { value: 4, label: "Seleção" },
] as const;

export const customFieldTypeLabels: Record<CustomFieldDef["type"], string> = {
  Text: "Texto",
  Number: "Número",
  Date: "Data",
  Select: "Seleção",
};
