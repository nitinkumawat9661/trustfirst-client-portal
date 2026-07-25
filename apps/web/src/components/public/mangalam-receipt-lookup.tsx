"use client";

import { FileSearch, LoaderCircle, ReceiptText } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

type ReceiptResult = {
  amountCents: number;
  currency: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTitle: string;
  paidAmountCents: number;
  paymentMode: string;
  receiptNumber: string;
  receivedAt: string;
  totalAmountCents: number;
};

export function MangalamReceiptLookup() {
  const [number, setNumber] = useState("");
  const [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReceipt(null);
    setMessage(null);

    const normalizedNumber = number.trim();

    if (!normalizedNumber) {
      setMessage("Enter the receipt number printed on your receipt.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/public/receipt?number=${encodeURIComponent(normalizedNumber)}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload = (await response.json()) as
        | ReceiptResult
        | { error?: string };

      if (!response.ok) {
        setMessage(
          "error" in payload && payload.error
            ? payload.error
            : "Receipt could not be found.",
        );
        return;
      }

      setReceipt(payload as ReceiptResult);
    } catch {
      setMessage("Unable to check the receipt right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f2eb] text-zinc-950">
      <header className="border-b border-white/10 bg-[#151515] text-white">
        <div className="mx-auto flex min-h-20 max-w-5xl items-center px-4 sm:px-6">
          <a className="text-sm font-semibold tracking-[0.12em]" href="/">
            MANGALAM SANITARY
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#191919] text-[#d6aa58]">
            <FileSearch className="size-6" />
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Check payment receipt
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-zinc-600">
            Enter the complete receipt number exactly as printed, including
            slashes and the financial year.
          </p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <label className="block" htmlFor="receipt-number">
              <span className="text-sm font-medium">Receipt number</span>
              <input
                autoComplete="off"
                className="mt-2 h-12 w-full rounded-xl border border-black/15 bg-white px-4 font-mono text-sm outline-none transition focus:border-[#9a6b20] focus:ring-2 focus:ring-[#c69a49]/20"
                id="receipt-number"
                maxLength={80}
                name="number"
                onChange={(event) => setNumber(event.target.value)}
                placeholder="MS/REC/2026-27/00001"
                value={number}
              />
            </label>

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c69a49] px-5 font-semibold text-black transition hover:bg-[#d8ae61] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <FileSearch className="size-5" />
              )}
              {loading ? "Checking..." : "Check receipt"}
            </button>
          </form>

          {message ? (
            <div
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {message}
            </div>
          ) : null}

          {receipt ? (
            <article className="mt-8 rounded-2xl border border-black/10 bg-[#faf8f3] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ReceiptText className="mt-1 size-6 text-[#9a6b20]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a6b20]">
                    Verified receipt
                  </p>
                  <h2 className="mt-1 font-mono text-lg font-semibold">
                    {receipt.receiptNumber}
                  </h2>
                </div>
              </div>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <ReceiptField
                  label="Amount received"
                  value={formatMoney(receipt.amountCents, receipt.currency)}
                />
                <ReceiptField
                  label="Received on"
                  value={formatDate(receipt.receivedAt)}
                />
                <ReceiptField
                  label="Invoice number"
                  value={receipt.invoiceNumber}
                />
                <ReceiptField
                  label="Payment mode"
                  value={receipt.paymentMode.replaceAll("_", " ")}
                />
                <ReceiptField
                  label="Invoice total"
                  value={formatMoney(
                    receipt.totalAmountCents,
                    receipt.currency,
                  )}
                />
                <ReceiptField
                  label="Total paid"
                  value={formatMoney(
                    receipt.paidAmountCents,
                    receipt.currency,
                  )}
                />
              </dl>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ReceiptField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    currency,
    style: "currency",
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}