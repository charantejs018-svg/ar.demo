import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  return (
    <DashboardClient
      user={{ name: user.name, email: user.email }}
      storageUsed={Number(user.storageUsed)}
      storageLimit={Number(user.storageLimit)}
    />
  );
}
