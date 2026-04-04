import { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MainLayout from "../Layouts/MainLayout";
import Dashboard from "../Pages/Dashboard";
import Login from "../Pages/Login";
import Schedules from "../Pages/Schedules";
import Staff from "../Pages/Staff";
import Locations from "../Pages/Locations";
import Swaps from "../Pages/Swaps";
import Settings from "../Pages/Settings";
import Availability from "../Pages/Availability";
import StaffAssignments from "../Pages/StaffAssignments";
import { fetchProfile, verifyAuth } from "../Store/Features/authSlice";
import { hasRole } from "../utils/roles";

const ProtectedLayout = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, accessToken, user } = useSelector((state) => state.auth);

  useEffect(() => {
    const hydrateAuth = async () => {
      if (!accessToken || user) return;
      const verified = await dispatch(verifyAuth());
      if (verifyAuth.fulfilled.match(verified)) {
        dispatch(fetchProfile());
      }
    };
    hydrateAuth();
  }, [accessToken, user, dispatch]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout />;
};

const PublicOnlyRoute = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
};

const RoleRoute = ({ roles }) => {
  const user = useSelector((state) => state.auth.user);
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
        element: <RoleRoute roles={["admin"]} />,
        children: [{ path: "staff", element: <Staff /> }],
      },
      {
        element: <RoleRoute roles={["staff"]} />,
        children: [{ path: "availability", element: <Availability /> }],
      },
      {
        element: <RoleRoute roles={["admin", "manager"]} />,
        children: [{ path: "assignments", element: <StaffAssignments /> }],
      },
      {
        element: <RoleRoute roles={["admin", "manager"]} />,
        children: [{ path: "locations", element: <Locations /> }],
      },
      { path: "swaps", element: <Swaps /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

const AppRoutes = () => <RouterProvider router={router} />;

export default AppRoutes;
