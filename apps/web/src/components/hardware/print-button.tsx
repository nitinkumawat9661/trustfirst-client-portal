"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" onClick={() => window.print()} type="button">
      <Printer className="size-4" />Print
    </button>
  );
}
