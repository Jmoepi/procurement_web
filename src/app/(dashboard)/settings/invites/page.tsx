"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function InvitesPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [invitesList, setInvitesList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInvite(null);

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || null, role, expiresAt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create invite");

      setInvite(data.invite);
      toast({ title: "Invite created", description: "Copy the token and send to the user." });
      setEmail("");
      setRole("member");
      setExpiresAt(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || String(err) });
    } finally {
      setLoading(false);
      await fetchInvites();
    }
  };

  const fetchInvites = async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      if (query) params.set('q', query);
      const res = await fetch(`/api/admin/invites?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch invites");
      setInvitesList(data.invites || []);
      setTotal(data.meta?.total ?? 0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || String(err) });
    }
  };

  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch("/api/admin/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to revoke invite");
      toast({ title: "Invite revoked" });
      await fetchInvites();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || String(err) });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Copy failed', description: e?.message || String(e) });
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    await fetchInvites();
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Create Invite</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 max-w-md">
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="invitee@example.com" />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <select id="role" className="w-full rounded-md border p-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <Label htmlFor="expiresAt">Expires at (optional)</Label>
          <Input id="expiresAt" type="datetime-local" value={expiresAt ?? ""} onChange={(e) => setExpiresAt(e.target.value || null)} />
        </div>

        <div>
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create invite"}</Button>
        </div>
      </form>

      {invite && (
        <div className="p-4 rounded-md border max-w-md">
          <p className="font-medium">Invite created:</p>
          <p className="break-all">Token: {invite.token}</p>
          <p>Email: {invite.email ?? "(any)"}</p>
          <p>Role: {invite.role}</p>
          <p>Expires: {invite.expires_at ?? "never"}</p>
        </div>
      )}
      <div className="mt-6">
        <h3 className="text-md font-semibold">Existing invites</h3>

        <form onSubmit={handleSearch} className="flex gap-2 items-center my-3 max-w-2xl">
          <Input placeholder="Search token or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit">Search</Button>
          <Button type="button" variant="ghost" onClick={() => { setQuery(''); setPage(1); fetchInvites(); }}>Clear</Button>
        </form>

        <div className="space-y-2 mt-3 max-w-2xl">
          {invitesList.length === 0 && <p className="text-sm text-muted-foreground">No invites yet.</p>}
          {invitesList.map((it) => (
            <div key={it.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="min-w-0">
                <p className="text-sm break-all">{it.token}</p>
                <p className="text-xs text-muted-foreground">{it.email ?? "(any)"} · {it.role} · Expires: {it.expires_at ?? 'never'}</p>
                <p className="text-xs text-muted-foreground">{it.used ? 'Used' : (it.revoked_at ? `Revoked at ${new Date(it.revoked_at).toLocaleString()}` : 'Active')}</p>
                {it.revoked_by && <p className="text-xs text-muted-foreground">Revoked by: {it.revoked_by}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleCopy(it.token)}>Copy</Button>
                <Button variant="destructive" size="sm" onClick={() => handleRevoke(it.id)} disabled={!!it.used || !!it.revoked_at}>Revoke</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button onClick={async () => { if (page > 1) { setPage(page - 1); await fetchInvites(); } }} disabled={page <= 1}>Previous</Button>
          <div>Page {page} of {totalPages}</div>
          <Button onClick={async () => { if (page < totalPages) { setPage(page + 1); await fetchInvites(); } }} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>
    </div>
  );
}
