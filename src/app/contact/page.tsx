import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "お問い合わせ" };

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const url = process.env.NEXT_PUBLIC_CONTACT_URL;

  return (
    <LegalPage title="お問い合わせ">
      <p>
        本アプリに関するお問い合わせ、利用規約に違反する行為の報告、アカウントの削除依頼は、下記までご連絡ください。
      </p>
      <ul>
        {url && (
          <li>
            お問い合わせフォーム:{" "}
            <a href={url} className="underline" target="_blank" rel="noopener noreferrer">
              {url}
            </a>
          </li>
        )}
        {email && (
          <li>
            メール:{" "}
            <a href={`mailto:${email}`} className="underline">
              {email}
            </a>
          </li>
        )}
        {!url && !email && <li>問い合わせ先は準備中です。</li>}
      </ul>
      <p className="text-muted-foreground">
        違反行為の報告の際は、該当するイベントのURLと内容をお知らせください。利用者間のトラブル（参加費・当日の出来事など）には、運営者は関与できません。
      </p>
    </LegalPage>
  );
}
