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
import { fetchProfile, verifyAuth } from "../Store/Features/authSlice";

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
      { path: "schedule", element: <Schedules /> },
      { path: "staff", element: <Staff /> },
      { path: "locations", element: <Locations /> },
      { path: "swaps", element: <Swaps /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

const AppRoutes = () => <RouterProvider router={router} />;

export default AppRoutes;
