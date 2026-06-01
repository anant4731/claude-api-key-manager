import { NextResponse } from "next/server";
import { syncFromAnthropic } from "@/lib/sync";
import { getActiveAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  if (!(await getActiveAccount())) {
    return NextResponse.json(
      { error: "No account connected" },
      { status: 400 }
    );
  }
  try {
    const result = await syncFromAnthropic();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
