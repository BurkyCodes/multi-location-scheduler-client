import React, { useEffect, useState } from "react";
import { Layout, Menu, Button, Avatar, Dropdown } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MapPin,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  LogOut,
  Clock3,
  ClipboardCheck,
} from "lucide-react";
import {CoffeeOutlined} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../Store/Features/authSlice";
import { hasRole } from "../utils/roles";

const { Sider, Content, Header } = Layout;
const PALETTE = {
  black: "#0B0B0B",
  white: "#FFFFFF",
  gray: "#f8fafc",
  p1: "#533c2e",
  p2: "#a65430",
  p3: "#f6873a",
  p4: "#fcbc5c",
  p5: "#ffd799",
};

const MainLayout = () => {
  const MOBILE_BREAKPOINT = 992;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const roleLabel =
    user?.role_id?.role ||
    (Array.isArray(user?.status) && user.status.length ? user.status[0] : null) ||
    "User";
  const isAdmin = hasRole(user, ["admin"]);
  const isStaff = hasRole(user, ["staff"]);
  const userInitial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  const isManager = hasRole(user, ["manager"]);

  const allMenuItems = [
    { key: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { key: "/schedule", icon: <Calendar size={20} />, label: "Schedules", roles: ["admin", "manager"] },
    { key: "/shifts", icon: <Calendar size={20} />, label: "Shifts", roles: ["admin", "manager"] },
    { key: "/assignments", icon: <ClipboardCheck size={20} />, label: "Assignments", roles: ["admin", "manager"] },
    { key: "/swaps", icon: <ArrowLeftRight size={20} />, label: "Shift Swaps" },
    { key: "/availability", icon: <Clock3 size={20} />, label: "Availability", roles: ["staff"] },
    { key: "/staff", icon: <Users size={20} />, label: "Staff Management", roles: ["admin"] },
    { key: "/locations", icon: <MapPin size={20} />, label: "Locations", roles: ["admin", "manager"] },
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles?.length) return true;
    if (item.roles.includes("admin") && item.roles.includes("manager")) return isAdmin || isManager;
    if (item.roles.includes("admin")) return isAdmin;
    if (item.roles.includes("manager")) return isManager;
    if (item.roles.includes("staff")) return isStaff;
    return false;
  });

  const bottomMenuItems = [
    { key: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  const userMenuItems = [
    { key: "logout", icon: <LogOut size={14} />, label: "Logout" },
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setCollapsed((prev) => !prev);
  const onMenuNavigate = (key) => {
    navigate(key);
    if (isMobile) setCollapsed(true);
  };

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: PALETTE.white }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={isMobile ? 0 : 80}
        theme="light"
        width={260}
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          zIndex: 100,
          backgroundColor: PALETTE.white,
          borderRight: "1px solid #f1f5f9",
          boxShadow: isMobile && !collapsed ? "0 20px 40px rgba(15, 23, 42, 0.22)" : "none",
        }}
      >
        <div className="p-6 flex flex-row items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
            style={{ backgroundColor: PALETTE.p3, color: "#ffffff" }}
          >
            <CoffeeOutlined style={{ fontSize: 22 }} />
          </div>
          {!collapsed && (
            <span
              className="text-xl font-black tracking-tight whitespace-nowrap"
              style={{ fontFamily: "'Montserrat', sans-serif", color: PALETTE.black }}
            >
              Coastal <span style={{ color: PALETTE.p3 }}>Eats</span>
            </span>
          )}
        </div>

        <div className="mt-4 px-3 flex flex-col justify-between h-[calc(100%-120px)]">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => onMenuNavigate(key)}
            className="border-none"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              backgroundColor: PALETTE.white,
            }}
          />
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={bottomMenuItems}
            onClick={({ key }) => onMenuNavigate(key)}
            className="border-none mt-auto pb-4"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              backgroundColor: PALETTE.white,
            }}
          />
        </div>
      </Sider>

      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 80 : 260,
          transition: "all 0.2s",
          backgroundColor: PALETTE.white,
        }}
      >
        <Header
          style={{
            background: PALETTE.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 90,
            height: 72,
            borderBottom: "1px solid #f1f5f9",
            padding: isMobile ? "0 14px" : "0 24px",
          }}
        >
          <Button
            type="text"
            icon={
              collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />
            }
            onClick={toggleSidebar}
            style={{ color: "#ffffff", backgroundColor: PALETTE.p3,display: "flex", alignItems: "center", justifyContent: "center" }}
          />

          <div className="flex flex-row  items-center gap-3">
            <p
              className="text-[11px] font-bold uppercase m-0"
              style={{ color: PALETTE.black, letterSpacing: "0.08em" }}
            >
              {roleLabel}
            </p>
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === "logout") handleLogout();
                },
              }}
              trigger={["click"]}
            >
              <button type="button" className="cursor-pointer border-0 bg-transparent p-0">
                <Avatar
                  size={40}
                  style={{ backgroundColor: PALETTE.p3, color: "#ffffff" }}
                  className="shadow-md"
                >
                  {userInitial}
                </Avatar>
              </button>
            </Dropdown>
          </div>

        </Header>

        <Content
          style={{
            padding: isMobile ? "16px" : "32px",
            minHeight: 280,
            backgroundColor: PALETTE.white,
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {isMobile && !collapsed ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setCollapsed(true)}
          className="fixed inset-0 bg-slate-900/30 border-0 p-0 m-0"
          style={{ zIndex: 95 }}
        />
      ) : null}

      <style>{`
        .ant-menu-item-selected {
          background-color: #fff7ed !important;
          color: ${PALETTE.p3} !important;
          border-radius: 12px !important;
        }
        .ant-menu-item-selected .ant-menu-item-icon {
          color: ${PALETTE.p3} !important;
        }
        .ant-menu-item {
          border-radius: 12px !important;
          margin-bottom: 4px !important;
          color: #64748b !important;
        }
        .ant-menu-item:hover {
          background-color: #f8fafc !important;
          color: ${PALETTE.p3} !important;
        }
        .ant-layout-sider {
          background: ${PALETTE.white} !important;
          border-inline-end: 1px solid #f1f5f9 !important;
        }
        .ant-layout-has-sider > .ant-layout {
          border-inline-start: none !important;
        }
        .ant-layout, .ant-layout * {
          border-inline-width: 0 !important;
        }
      `}</style>
    </Layout>
  );
};

export default MainLayout;
