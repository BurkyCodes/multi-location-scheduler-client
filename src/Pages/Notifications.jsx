import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card } from "antd";
import { Bell, CheckCheck, CircleCheckBig, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  clearNotifications,
  deleteNotification,
  fetchNotificationsFeed,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../Store/Features/notificationsSlice";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const getId = (item) => String(item?._id || item?.id || "");
const ensureLeadingSlash = (path) => {
  if (!path) return "";
  if (String(path).startsWith("http://") || String(path).startsWith("https://")) return path;
  return String(path).startsWith("/") ? path : `/${path}`;
};
const extractScheduleId = (item) =>
  item?.schedule_id ||
  item?.data?.schedule_id ||
  item?.data?.scheduleId ||
  item?.data?.id ||
  "";
const extractScheduleIdFromLink = (link) => {
  if (!link || String(link).startsWith("http://") || String(link).startsWith("https://")) return "";
  try {
    const url = new URL(ensureLeadingSlash(link), "http://local.test");
    return url.searchParams.get("scheduleId") || "";
  } catch {
    return "";
  }
};

const statusPillClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "unread") return "bg-amber-100 text-amber-800";
  if (normalized === "read") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
};

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { list, unreadCount, loading, saving } = useSelector((state) => state.notifications);
  const userId = user?._id || user?.id;
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchNotificationsFeed({ orgUserId: userId, page: 1, limit: 100 }));
    dispatch(fetchUnreadCount(userId));
  }, [dispatch, userId]);

  const visibleNotifications = useMemo(() => {
    if (activeFilter === "all") return list;
    return list.filter((item) => String(item?.status || "").toLowerCase() === activeFilter);
  }, [activeFilter, list]);

  const navigateToNotificationLink = (link, item) => {
    if (!link) return;
    if (String(link).startsWith("http://") || String(link).startsWith("https://")) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    const internalLink = ensureLeadingSlash(link);
    const pathOnly = internalLink.split("?")[0];

    if (pathOnly === "/schedule") {
      const scheduleId = String(extractScheduleIdFromLink(internalLink) || extractScheduleId(item) || "");
      navigate("/schedule", {
        state: {
          openDrawer: true,
          ...(scheduleId ? { scheduleId } : {}),
        },
      });
      return;
    }

    navigate(internalLink);
  };

  const openNotification = async (item) => {
    const id = getId(item);
    if (!id) return;
    if (String(item?.status).toLowerCase() === "unread") {
      await dispatch(markNotificationRead(id));
      if (userId) {
        await dispatch(fetchNotificationsFeed({ orgUserId: userId, page: 1, limit: 100 }));
        dispatch(fetchUnreadCount(userId));
      }
    }
    navigateToNotificationLink(item?.link, item);
  };

  const markAllRead = async () => {
    if (!userId) return;
    const result = await dispatch(markAllNotificationsRead(userId));
    if (markAllNotificationsRead.fulfilled.match(result)) {
      dispatch(fetchUnreadCount(userId));
      toast.success("All notifications marked as read");
    } else {
      toast.error(result?.payload || "Failed to mark all as read");
    }
  };

  const deleteOne = async (id) => {
    const result = await dispatch(deleteNotification(id));
    if (deleteNotification.fulfilled.match(result)) {
      if (userId) dispatch(fetchUnreadCount(userId));
      toast.success("Notification deleted");
    } else {
      toast.error(result?.payload || "Failed to delete notification");
    }
  };

  const clearAll = async () => {
    const ids = visibleNotifications.map(getId).filter(Boolean);
    if (!ids.length) return;
    const result = await dispatch(clearNotifications(ids));
    if (clearNotifications.fulfilled.match(result)) {
      if (userId) dispatch(fetchUnreadCount(userId));
      toast.success("Notifications cleared");
    } else {
      toast.error(result?.payload || "Failed to clear notifications");
    }
  };

  return (
    <ModuleLayoutsOne
      title="Notifications"
      subtitle="Read, manage, and clear your in-app notifications."
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<CheckCheck size={14} />} onClick={markAllRead} loading={saving}>
            Mark All Read
          </Button>
          <Button danger icon={<Trash2 size={14} />} onClick={clearAll} loading={saving}>
            Clear Notifications
          </Button>
        </div>
      }
      tableHeaderBadges={[
        { text: `${list.length} total` },
        { text: `${unreadCount} unread` },
      ]}
      statsContent={
        <div className="p-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "read", label: "Read" },
            ].map((item) => (
              <Button
                key={item.key}
                type={activeFilter === item.key ? "primary" : "default"}
                onClick={() => setActiveFilter(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <Card className="rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-500 m-0">Loading notifications...</p>
            </Card>
          ) : visibleNotifications.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-500 m-0">No notifications found.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleNotifications.map((item) => {
                const id = getId(item);
                const isRead = String(item?.status || "").toLowerCase() === "read";
                return (
                  <Card
                    key={id}
                    className="rounded-2xl border border-slate-200"
                    bodyStyle={{ padding: 16 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                        onClick={() => openNotification(item)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {isRead ? (
                            <CircleCheckBig size={14} color="#16a34a" />
                          ) : (
                            <Bell size={14} color="#f6873a" />
                          )}
                          <span
                            className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${statusPillClass(
                              item?.status
                            )}`}
                          >
                            {item?.status || "unread"}
                          </span>
                          {item?.category ? (
                            <span className="text-[11px] text-slate-500 uppercase">
                              {item.category}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-bold text-slate-900 m-0">
                          {item?.title || "Notification"}
                        </p>
                        <p className="text-sm text-slate-600 mt-1 mb-0">
                          {item?.message || "No message body"}
                        </p>
                        <p className="text-xs text-slate-500 mt-2 mb-0">
                          {formatDateTime(item?.createdAt || item?.created_at)}
                        </p>
                      </button>
                      <Button danger type="text" onClick={() => deleteOne(id)}>
                        Delete
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      }
    />
  );
};

export default Notifications;
