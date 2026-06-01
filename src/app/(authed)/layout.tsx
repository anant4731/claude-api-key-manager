import { redirect } from "next/navigation";
import { getActiveAccount } from "@/lib/accounts";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { hasAnyUser } from "@/lib/users";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasAnyUser())) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const account = await getActiveAccount();
  return (
    <AppShell account={account} user={user}>
      {children}
    </AppShell>
  );
}
