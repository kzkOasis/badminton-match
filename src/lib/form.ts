export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export type ParseResult<T, K extends string = string> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors<K> };

export type FormState<K extends string = string> = {
  errors?: FieldErrors<K>;
  message?: string;
  values?: Record<string, string>;
};

/** FormData から文字列を取り出して前後の空白を除く（未入力は ""） */
export function text(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
