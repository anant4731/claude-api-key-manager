import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) return { resp: NextResponse.json({ error: "Not authenticated" }, { status: 401 }), me: null };
  if (me.role !== "admin")
    return { resp: NextResponse.json({ error: "Admin only" }, { status: 403 }), me: null };
  return { resp: null, me };
}

export async function GET() {
  const { resp } = await requireAdmin();
  if (resp) return resp;
  const users = await listUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
  });
}

const CreateSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(8),
  displayName: z.string().optional(),
  role: z.enum(["admin", "user"]),
});

export async function POST(req: NextRequest) {
  const { resp, me } = await requireAdmin();
  if (resp) return resp;
  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  try {
    const user = await createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      createdBy: me!.id,
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
