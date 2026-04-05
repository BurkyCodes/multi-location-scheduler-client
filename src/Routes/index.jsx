import { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MainLayout from "../Layouts/MainLayout";
import Dashboard from "../Pages/Dashboard";
import Login from "../Pages/Login";
import Schedules from "../Pages/Schedules";
import Shifts from "../Pages/Shifts";
import Staff from "../Pages/Staff";
import Locations from "../Pages/Locations";
import Swaps from "../Pages/Swaps";
import Settings from "../Pages/Settings";
import Availability from "../Pages/Availability";
import StaffAssignments from "../Pages/StaffAssignments";
import Certifications from "../Pages/Certifications";
import StaffPreferences from "../Pages/StaffPreferences";
import EmployeeHours from "../Pages/EmployeeHours";
import { fetchProfile, verifyAuth } from "../Store/Features/authSlice";
import { hasRole } from "../utils/roles";

const RouteHydrationFallback = () => (
  <div className="min-h-[40vh] w-full flex items-center justify-center">
    <div className="text-sm font-semibold text-slate-500">Loading session...</div>
  </div>
);

const ProtectedLayout = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, accessToken, user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    const hydrateAuth = async () => {
      if (!accessToken || user || loading) return;
      const verified = await dispatch(verifyAuth());
      if (verifyAuth.fulfilled.match(verified)) {
        dispatch(fetchProfile());
      }
    };
    hydrateAuth();
  }, [accessToken, user, loading, dispatch]);

  if (accessToken && !user) return <RouteHydrationFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout />;
};

const PublicOnlyRoute = () => {
  const { isAuthenticated, accessToken, user, loading } = useSelector((state) => state.auth);
  if (accessToken && !user && loading) return <RouteHydrationFallback />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
};

const RoleRoute = ({ roles }) => {
  const { user, accessToken } = useSelector((state) => state.auth);
  if (accessToken && !user) return <RouteHydrationFallback />;
  if (!hasRole(user, roles)) return <Navigate to="/" replace />;
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [{ path: "/login", element: <Login /> }],
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        element: <RoleRoute roles={["admin", "manager"]} />,
        children: [{ path: "schedule", element: <Schedules /> }],
      },
      {
        element: <RoleRoute roles={["admin", "manager"]} />,
        children: [{ path: "shifts", element: <Shifts /> }],
      },
      {
        element: <RoleRoute roles={["admin"]} />,
        children: [{ path: "staff", element: <Staff /> }],
      },
      {
        element: <RoleRoute roles={["staff"]} />,
        children: [{ path: "availability", element: <Availability /> }],
      },
      {
        element: <RoleRoute roles={["staff"]} />,
        children: [{ path: "staff-preferences", element: <StaffPreferences /> }],
      },
      {
        element: <RoleRoute roles={["manager"]} />,
        children: [{ path: "assignments", element: <StaffAssignments /> }],
      },
      {
        element: <RoleRoute roles={["admin", "manager"]} />,
        children: [{ path: "employee-hours", element: <EmployeeHours /> }],
      },
      {
        element: <RoleRoute roles={["admin", "manager"]} />,
        children: [{ path: "locations", element: <Locations /> }],
      },
      {
        element: <RoleRoute roles={["admin", "manager", "staff"]} />,
        children: [{ path: "certifications", element: <Certifications /> }],
      },
      { path: "swaps", element: <Swaps /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

const AppRoutes = () => <RouterProvider router={router} />;

export default AppRoutes;
