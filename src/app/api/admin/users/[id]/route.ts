import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { changeUserRole, deleteUser, getUserById } from "@/lib/users";

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
  const u = await getUserById(id);
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    user: {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    },
  });
}

const PatchSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { resp, me } = await requireAdmin();
  if (resp) return resp;
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
    if (parsed.data.role) {
      if (id === me!.id && parsed.data.role !== "admin") {
        return NextResponse.json(
          { error: "You can't demote yourself." },
          { status: 400 }
        );
      }
      await changeUserRole(id, parsed.data.role);
    }
    const u = await getUserById(id);
    return NextResponse.json({ user: u });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { resp, me } = await requireAdmin();
  if (resp) return resp;
  const { id } = await ctx.params;
  if (id === me!.id) {
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 }
    );
  }
  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
