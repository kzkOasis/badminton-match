import { type FieldErrors, type ParseResult, text } from "./form";
import { isLevel, type Level } from "./levels";

export type ProfileInput = {
  display_name: string;
  level: Level;
  area: string | null;
  bio: string | null;
};

type Field = keyof ProfileInput;

export function parseProfileForm(formData: FormData): ParseResult<ProfileInput, Field> {
  const errors: FieldErrors<Field> = {};
  const displayName = text(formData, "display_name");
  const level = text(formData, "level");
  const area = text(formData, "area");
  const bio = text(formData, "bio");

  if (!displayName) errors.display_name = "表示名を入力してください";
  else if ([...displayName].length > 30) errors.display_name = "表示名は30文字以内にしてください";

  if (!isLevel(level)) errors.level = "レベルを選んでください";

  if ([...area].length > 50) errors.area = "活動地域は50文字以内にしてください";
  if ([...bio].length > 500) errors.bio = "自己紹介は500文字以内にしてください";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      display_name: displayName,
      level: level as Level,
      area: area || null,
      bio: bio || null,
    },
  };
}
