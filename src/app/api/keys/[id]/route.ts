import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteKey,
  getKey,
  renameManualKey,
  syncKeyStatusToAnthropic,
  updateKeyBudget,
} from "@/lib/keys";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const key = await getKey(id);
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ key });
}

const PatchSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  monthlyBudgetCents: z.number().int().min(1).max(100_000_000).optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    if (parsed.data.status) {
      await syncKeyStatusToAnthropic(id, parsed.data.status);
    }
    if (parsed.data.name) {
      const existing = await getKey(id);
      if (existing?.anthropicKeyId) {
        return NextResponse.json(
          { error: "Auto-synced keys must be renamed in the Anthropic Console." },
          { status: 400 }
        );
      }
      await renameManualKey(id, parsed.data.name);
    }
    if (parsed.data.monthlyBudgetCents !== undefined) {
      await updateKeyBudget(id, parsed.data.monthlyBudgetCents);
    }
    const key = await getKey(id);
    return NextResponse.json({ key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  await deleteKey(id);
  return NextResponse.json({ ok: true });
}
