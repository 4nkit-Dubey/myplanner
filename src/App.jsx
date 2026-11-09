import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";

const CreatePlanPage = lazy(() => import("./pages/CreatePlanPage.jsx"));
const DailyPage = lazy(() => import("./pages/DailyPage.jsx"));
const MonthlyPage = lazy(() => import("./pages/MonthlyPage.jsx"));
const OverviewPage = lazy(() => import("./pages/OverviewPage.jsx"));
const WeeklyPage = lazy(() => import("./pages/WeeklyPage.jsx"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="page-content" role="status">
          Loading view...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="monthly" element={<MonthlyPage />} />
          <Route path="weekly" element={<WeeklyPage />} />
          <Route path="daily" element={<DailyPage />} />
          <Route path="create" element={<CreatePlanPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
