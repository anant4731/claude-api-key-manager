import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listKeys, registerManualKey } from "@/lib/keys";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

export async function GET() {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const keys = await listKeys();
  return NextResponse.json({ keys });
}

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(160),
  rawKey: z.string().min(20),
  monthlyBudgetCents: z.number().int().min(1).max(100_000_000),
});

export async function POST(req: NextRequest) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const json = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    const key = await registerManualKey(parsed.data);
    return NextResponse.json({ key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
