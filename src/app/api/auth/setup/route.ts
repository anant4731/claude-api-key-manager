import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, hasAnyUser } from "@/lib/users";
import { createSession, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SetupSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (await hasAnyUser()) {
    return NextResponse.json(
      { error: "Setup has already been completed. Sign in instead." },
      { status: 409 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = SetupSchema.safeParse(json);
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
      role: "admin",
      createdBy: null,
    });
    const token = await createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
