"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/database.types";
import type { FormState } from "@/lib/form";
import { LEVEL_LABELS, LEVELS } from "@/lib/levels";
import { saveProfile } from "./actions";

export function ProfileForm({
  profile,
  defaultName,
  next,
}: {
  profile: Tables<"profiles"> | null;
  defaultName: string;
  next: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const v = state.values;
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormField
        id="display_name"
        label="表示名"
        required
        error={e.display_name}
        hint="他の利用者に表示されます。本名や連絡先は書かないでください。"
      >
        <Input
          id="display_name"
          name="display_name"
          maxLength={30}
          defaultValue={v?.display_name ?? profile?.display_name ?? defaultName}
          aria-invalid={!!e.display_name}
        />
      </FormField>
      <FormField id="level" label="レベル" required error={e.level}>
        <NativeSelect
          id="level"
          name="level"
          defaultValue={v?.level ?? profile?.level ?? ""}
          aria-invalid={!!e.level}
        >
          <option value="" disabled>
            選んでください
          </option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="area" label="活動地域" error={e.area} hint="例: 千葉県船橋市">
        <Input
          id="area"
          name="area"
          maxLength={50}
          defaultValue={v?.area ?? profile?.area ?? ""}
          aria-invalid={!!e.area}
        />
      </FormField>
      <FormField
        id="bio"
        label="自己紹介"
        error={e.bio}
        hint="他の利用者に表示されます。連絡先（電話番号・SNS など）は書かないでください。"
      >
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={500}
          defaultValue={v?.bio ?? profile?.bio ?? ""}
          aria-invalid={!!e.bio}
        />
      </FormField>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "保存しています…" : "保存する"}
      </Button>
    </form>
  );
}
