import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {updated && <p className="text-muted-foreground text-xs">{updated}</p>}
      </header>
      {children}
    </article>
  );
}
