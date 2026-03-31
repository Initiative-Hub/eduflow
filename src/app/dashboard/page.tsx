// d:\PROJECTS\eduflow\app\dashboard\page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardHomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome to the Dashboard!</h1>
    </div>
  );
}
