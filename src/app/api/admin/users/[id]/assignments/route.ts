import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  assignKeyToUser,
  getUserById,
  listKeyIdsForUser,
  unassignKeyFromUser,
} from "@/lib/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) return { resp: NextResponse.json({ error: "Not authenticated" }, { status: 401 }), me: null };
  if (me.role !== "admin")
    return { resp: NextResponse.json({ error: "Admin only" }, { status: 403 }), me: null };
  return { resp: null, me };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { resp } = await requireAdmin();
  if (resp) return resp;
  const { id } = await ctx.params;
  const ids = await listKeyIdsForUser(id);
  return NextResponse.json({ keyIds: ids });
}

const AssignSchema = z.object({
  apiKeyId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { resp, me } = await requireAdmin();
  if (resp) return resp;
  const { id } = await ctx.params;
  const target = await getUserById(id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const json = await req.json().catch(() => null);
  const parsed = AssignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    await assignKeyToUser(parsed.data.apiKeyId, id, me!.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

const DeleteSchema = z.object({
  apiKeyId: z.string().min(1),
});

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { resp } = await requireAdmin();
  if (resp) return resp;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    await unassignKeyFromUser(parsed.data.apiKeyId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
