import * as React from "react";
import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
