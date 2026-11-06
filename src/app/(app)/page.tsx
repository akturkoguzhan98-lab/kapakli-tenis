import { requireUser } from "@/lib/auth";
import AdminDashboard from "./dashboards/AdminDashboard";
import CoachDashboard from "./dashboards/CoachDashboard";
import ParentDashboard from "./dashboards/ParentDashboard";

export default async function Home() {
  const user = await requireUser();
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "COACH") return <CoachDashboard user={user} />;
  return <ParentDashboard user={user} />;
}
