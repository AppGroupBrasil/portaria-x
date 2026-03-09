import { useAuth } from "@/hooks/useAuth";
import Dashboard from "./Dashboard";
import DashboardAdmin from "./DashboardAdmin";
import DashboardSindico from "./DashboardSindico";
import DashboardFuncionario from "./DashboardFuncionario";
import DashboardMorador from "./DashboardMorador";
import DemoBanner from "@/components/DemoBanner";

export default function DashboardRouter() {
  const { user } = useAuth();
  const role = user?.role;

  let content;
  switch (role) {
    case "master":
      content = <Dashboard />; break;
    case "administradora":
      content = <DashboardAdmin />; break;
    case "sindico":
      content = <DashboardSindico />; break;
    case "funcionario":
      content = <DashboardFuncionario />; break;
    case "morador":
      content = <DashboardMorador />; break;
    default:
      content = <DashboardMorador />; break;
  }

  return (
    <>
      <DemoBanner />
      {content}
    </>
  );
}
