import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { authenticateUser, changePassword } from "@/lib/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ChangePasswordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const valid = await authenticateUser(user.email, parsed.data.current);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 }
    );
  }
  try {
    await changePassword(user.id, parsed.data.next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
