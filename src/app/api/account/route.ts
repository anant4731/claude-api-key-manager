import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectAccount, disconnectAccount, getActiveAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

async function requireAdminResponse() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await requireAdminResponse();
  if (blocked) return blocked;
  const account = await getActiveAccount();
  if (!account) return NextResponse.json({ account: null });
  return NextResponse.json({
    account: {
      id: account.id,
      orgId: account.orgId,
      orgName: account.orgName,
      partialAdminKeyHint: account.partialAdminKeyHint,
      connectedAt: account.connectedAt,
      lastSyncedAt: account.lastSyncedAt,
    },
  });
}

const ConnectSchema = z.object({
  adminKey: z.string().min(20),
});

export async function POST(req: NextRequest) {
  const blocked = await requireAdminResponse();
  if (blocked) return blocked;
  const json = await req.json().catch(() => null);
  const parsed = ConnectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    const account = await connectAccount(parsed.data.adminKey);
    return NextResponse.json({
      account: { id: account.id, orgName: account.orgName },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE() {
  const blocked = await requireAdminResponse();
  if (blocked) return blocked;
  await disconnectAccount();
  return NextResponse.json({ ok: true });
}
