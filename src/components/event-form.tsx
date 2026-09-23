"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/database.types";
import { isoToJstParts } from "@/lib/datetime";
import type { EventFormField } from "@/lib/event-form";
import type { FormState } from "@/lib/form";
import { LEVEL_LABELS, LEVELS } from "@/lib/levels";
import { PREFECTURES, splitArea } from "@/lib/prefectures";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

type Values = Record<
  | "title" | "date" | "start_time" | "end_time" | "venue" | "prefecture" | "city"
  | "level_min" | "level_max" | "capacity" | "fee" | "description" | "requires_approval",
  string
>;

function initialValues(event: Tables<"events"> | null, defaultPrefecture: string): Values {
  if (!event) {
    return {
      title: "",
      date: "",
      start_time: "",
      end_time: "",
      venue: "",
      prefecture: defaultPrefecture,
      city: "",
      level_min: "",
      level_max: "",
      capacity: "",
      fee: "0",
      description: "",
      requires_approval: "on",
    };
  }
  const start = isoToJstParts(event.starts_at);
  const end = isoToJstParts(event.ends_at);
  const { prefecture, city } = splitArea(event.area);
  return {
    title: event.title,
    date: start.date,
    start_time: start.time,
    end_time: end.time,
    venue: event.venue,
    prefecture,
    city,
    level_min: event.level_min ?? "",
    level_max: event.level_max ?? "",
    capacity: String(event.capacity),
    fee: String(event.fee),
    description: event.description ?? "",
    requires_approval: event.requires_approval ? "on" : "",
  };
}

export function EventForm({
  action,
  event = null,
  defaultPrefecture = "",
  submitLabel,
  minCapacity = 1,
}: {
  action: Action;
  event?: Tables<"events"> | null;
  defaultPrefecture?: string;
  submitLabel: string;
  minCapacity?: number;
}) {
  const [state, formAction, pending] = useActionState<FormState<EventFormField>, FormData>(action, {});
  // 送信後はサーバーから返った値を優先する（入力を消さないため）
  const v: Values = state.values
    ? ({ ...state.values, requires_approval: state.values.requires_approval ?? "" } as Values)
    : initialValues(event, defaultPrefecture);
  const e = state.errors ?? {};
  // 値が変わったときに defaultValue を反映させるため、送信ごとに key を変える
  const key = JSON.stringify(v);

  return (
    <form action={formAction} className="space-y-5" key={key}>
      <FormField id="title" label="タイトル" required error={e.title}>
        <Input
          id="title"
          name="title"
          maxLength={60}
          placeholder="例: 平日夜のゲーム練習"
          defaultValue={v.title}
          aria-invalid={!!e.title}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <FormField id="date" label="開催日" required error={e.date}>
            <Input id="date" name="date" type="date" defaultValue={v.date} aria-invalid={!!e.date} />
          </FormField>
        </div>
        <FormField id="start_time" label="開始" required error={e.start_time}>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            step={300}
            defaultValue={v.start_time}
            aria-invalid={!!e.start_time}
          />
        </FormField>
        <FormField id="end_time" label="終了" required error={e.end_time}>
          <Input
            id="end_time"
            name="end_time"
            type="time"
            step={300}
            defaultValue={v.end_time}
            aria-invalid={!!e.end_time}
          />
        </FormField>
      </div>

      <FormField id="venue" label="会場（体育館名）" required error={e.venue}>
        <Input
          id="venue"
          name="venue"
          maxLength={100}
          placeholder="例: 船橋市総合体育館 第1競技場"
          defaultValue={v.venue}
          aria-invalid={!!e.venue}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="prefecture" label="都道府県" required error={e.prefecture}>
          <NativeSelect
            id="prefecture"
            name="prefecture"
            defaultValue={v.prefecture}
            aria-invalid={!!e.prefecture}
          >
            <option value="">選んでください</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="city" label="市区町村" error={e.city}>
          <Input
            id="city"
            name="city"
            maxLength={40}
            placeholder="例: 船橋市"
            defaultValue={v.city}
            aria-invalid={!!e.city}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="level_min" label="レベル（下限）" error={e.level_min}>
          <NativeSelect id="level_min" name="level_min" defaultValue={v.level_min}>
            <option value="">指定なし</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="level_max" label="レベル（上限）" error={e.level_max}>
          <NativeSelect
            id="level_max"
            name="level_max"
            defaultValue={v.level_max}
            aria-invalid={!!e.level_max}
          >
            <option value="">指定なし</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="capacity"
          label="募集人数"
          required
          error={e.capacity}
          hint={minCapacity > 1 ? `参加確定が${minCapacity}人いるため、${minCapacity}人以上` : "主催者は含めない"}
        >
          <Input
            id="capacity"
            name="capacity"
            type="number"
            inputMode="numeric"
            min={minCapacity}
            max={100}
            defaultValue={v.capacity}
            aria-invalid={!!e.capacity}
          />
        </FormField>
        <FormField id="fee" label="参加費（円）" error={e.fee} hint="現地払い。無料なら0">
          <Input
            id="fee"
            name="fee"
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            step={10}
            defaultValue={v.fee}
            aria-invalid={!!e.fee}
          />
        </FormField>
      </div>

      <FormField
        id="description"
        label="説明"
        error={e.description}
        hint="練習内容・持ち物・シャトルの有無など。連絡先は書かず、参加確定後にチャットで伝えてください。"
      >
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          defaultValue={v.description}
          aria-invalid={!!e.description}
        />
      </FormField>

      <label className="flex items-start gap-3 rounded-md border p-3">
        <input
          type="checkbox"
          name="requires_approval"
          defaultChecked={v.requires_approval === "on"}
          className="mt-0.5 size-4"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">承認制にする</span>
          <span className="text-muted-foreground block text-xs">
            オンにすると、申し込みをあなたが承認してから参加確定になります。オフなら先着順で自動的に参加確定になります。
          </span>
        </span>
      </label>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "保存しています…" : submitLabel}
      </Button>
    </form>
  );
}
