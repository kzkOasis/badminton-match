import { describe, expect, it } from "vitest";
import { PREFECTURES, splitArea } from "./prefectures";

describe("prefectures", () => {
  it("47都道府県", () => {
    expect(PREFECTURES).toHaveLength(47);
  });

  it("splitArea", () => {
    expect(splitArea("千葉県船橋市")).toEqual({ prefecture: "千葉県", city: "船橋市" });
    expect(splitArea("京都府京都市")).toEqual({ prefecture: "京都府", city: "京都市" });
    expect(splitArea("どこか")).toEqual({ prefecture: "", city: "どこか" });
  });
});
