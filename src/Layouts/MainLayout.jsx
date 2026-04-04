import React, { useState } from "react";
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
} from "lucide-react";
import {CoffeeOutlined} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../Store/Features/authSlice";

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
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const roleLabel =
    user?.role_id?.role ||
    (Array.isArray(user?.status) && user.status.length ? user.status[0] : null) ||
    "User";
  const userInitial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  const menuItems = [
    { key: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { key: "/schedule", icon: <Calendar size={20} />, label: "Schedules" },
    { key: "/swaps", icon: <ArrowLeftRight size={20} />, label: "Shift Swaps" },
    { key: "/staff", icon: <Users size={20} />, label: "Staff Management" },
    { key: "/locations", icon: <MapPin size={20} />, label: "Locations" },
  ];

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

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: PALETTE.white }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={260}
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          zIndex: 100,
          backgroundColor: PALETTE.white,
          borderRight: "1px solid #f1f5f9",
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
            onClick={({ key }) => navigate(key)}
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
            onClick={({ key }) => navigate(key)}
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
          marginLeft: collapsed ? 80 : 260,
          transition: "all 0.2s",
          backgroundColor: PALETTE.white,
        }}
      >
        <Header
          style={{
            background: PALETTE.white,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 99,
            height: 72,
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <Button
            type="text"
            icon={
              collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />
            }
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: "#ffffff", backgroundColor: PALETTE.p3 }}
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
            padding: "32px",
            minHeight: 280,
            backgroundColor: PALETTE.white,
          }}
        >
          <Outlet />
        </Content>
      </Layout>

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
