"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

type ResetUserOption = { email: string; id: string; name: string | null };

export function ChangePasswordPanel({ resetUsers = [] }: { resetUsers?: ResetUserOption[] }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [targetUserId, setTargetUserId] = useState(resetUsers[0]?.id ?? "");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/auth/change-password", {
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      setError(body?.error?.message ?? "Password could not be changed.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password changed. Other active sessions are revoked where supported by the session store.");
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetting(true);
    setResetError(null);
    setResetMessage(null);
    const response = await fetch("/api/auth/admin-reset-password", {
      body: JSON.stringify({ temporaryPassword, userId: targetUserId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setResetting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      setResetError(body?.error?.message ?? "Temporary password could not be set.");
      return;
    }
    setTemporaryPassword("");
    setResetMessage("Temporary password set. Share it through an approved private channel and ask the user to change it after login.");
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Security</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:max-w-md" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Current password
            <Input autoComplete="current-password" required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            New password
            <Input autoComplete="new-password" minLength={12} required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          {error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
          {message ? <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p> : null}
          <Button disabled={saving} type="submit">{saving ? "Changing..." : "Change password"}</Button>
        </form>
        {resetUsers.length ? (
          <form className="mt-6 grid gap-4 border-t border-border pt-5 sm:max-w-md" onSubmit={resetPassword}>
            <h3 className="font-semibold">Owner/admin temporary reset</h3>
            <label className="grid gap-2 text-sm font-medium">
              User
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
                {resetUsers.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Temporary password
              <Input autoComplete="new-password" minLength={12} required type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} />
            </label>
            {resetError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{resetError}</p> : null}
            {resetMessage ? <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{resetMessage}</p> : null}
            <Button disabled={resetting || !targetUserId} type="submit" variant="outline">{resetting ? "Setting..." : "Set temporary password"}</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
