import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { disableProxy, enableProxy, getKey } from "@/lib/keys";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EnableSchema = z.object({ rawKey: z.string().min(20) });

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = EnableSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    await enableProxy(id, parsed.data.rawKey);
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
  await disableProxy(id);
  const key = await getKey(id);
  return NextResponse.json({ key });
}
