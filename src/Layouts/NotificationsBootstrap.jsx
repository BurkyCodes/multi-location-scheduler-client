import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Cookies } from "../Services/cookies";
import {
  fetchUnreadCount,
  prependNotification,
  registerPushToken,
  unregisterPushToken,
} from "../Store/Features/notificationsSlice";
import { getWebPushToken, subscribeForegroundPush } from "../Services/pushNotifications";
import { fetchNotificationPreferenceByUser } from "../Store/Features/preferencesSlice";
import { fetchSchedules } from "../Store/Features/schedulesSlice";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import {
  fetchAssignments,
  fetchOnDutyNow,
  fetchMyShiftTracking,
} from "../Store/Features/assignmentsSlice";
import { fetchSwapRequests } from "../Store/Features/swapRequestsSlice";

const ensureLeadingSlash = (path) => {
  if (!path) return "";
  if (String(path).startsWith("http://") || String(path).startsWith("https://")) return path;
  return String(path).startsWith("/") ? path : `/${path}`;
};
const extractScheduleId = (payload = {}) =>
  payload?.schedule_id ||
  payload?.scheduleId ||
  payload?.id ||
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const REALTIME_STATUS_EVENT = "realtime-connection-status";

const getAccessToken = () =>
  Cookies.get("access_token") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("accessToken") ||
  "";

const parseEventPayload = (raw) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const broadcastRealtimeStatus = (status) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REALTIME_STATUS_EVENT, {
      detail: {
        status,
        at: new Date().toISOString(),
      },
    })
  );
};

const NotificationsBootstrap = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const role = user?.role_id?.role || "";
  const canViewOnDuty = role === "admin" || role === "manager";
  const notificationPrefs = useSelector((state) =>
    state.preferences.notificationsByUser[String(userId || "")]
  );
  const inAppEnabled = Boolean(
    notificationPrefs?.channels?.in_app ??
      notificationPrefs?.in_app_enabled ??
      true
  );

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchNotificationPreferenceByUser(userId));
  }, [dispatch, userId]);

  useEffect(() => {
    if (!userId || !inAppEnabled) return;

    dispatch(fetchUnreadCount(userId));
    const timer = setInterval(() => {
      dispatch(fetchUnreadCount(userId));
    }, 60000);

    return () => clearInterval(timer);
  }, [dispatch, userId, inAppEnabled]);

  useEffect(() => {
    if (!userId || !inAppEnabled) return;
    let unmounted = false;

    const register = async () => {
      try {
        const token = await getWebPushToken();
        if (!token || unmounted) return;
        localStorage.setItem("fcm_token", token);
        dispatch(
          registerPushToken({
            org_user_id: userId,
            fcm_token: token,
            device_type: "web",
            device_name: navigator.userAgent || "browser",
          })
        );
      } catch {
        // Silent on push setup errors to avoid blocking app usage.
      }
    };

    register();
    return () => {
      unmounted = true;
    };
  }, [dispatch, userId, inAppEnabled]);

  useEffect(() => {
    if (!userId || inAppEnabled) return;
    const storedToken = localStorage.getItem("fcm_token");
    if (!storedToken) return;
    dispatch(unregisterPushToken({ fcm_token: storedToken }));
  }, [dispatch, userId, inAppEnabled]);

  useEffect(() => {
    if (!userId) return undefined;
    const token = getAccessToken();
    if (!token) {
      broadcastRealtimeStatus("offline");
      return undefined;
    }

    const stream = new EventSource(
      `${API_BASE_URL}/realtime/stream?token=${encodeURIComponent(token)}`
    );
    let offlineTimer = null;

    stream.onopen = () => {
      if (offlineTimer) {
        clearTimeout(offlineTimer);
        offlineTimer = null;
      }
      broadcastRealtimeStatus("connected");
    };

    stream.onerror = () => {
      broadcastRealtimeStatus("reconnecting");
      if (offlineTimer) clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => {
        broadcastRealtimeStatus("offline");
      }, 15000);
    };

    const refreshSchedules = () => dispatch(fetchSchedules());
    const refreshShifts = () => dispatch(fetchShifts());
    const refreshAssignments = () => {
      dispatch(fetchAssignments());
      dispatch(fetchMyShiftTracking());
      if (canViewOnDuty) dispatch(fetchOnDutyNow());
    };
    const refreshSwaps = () => dispatch(fetchSwapRequests());

    stream.addEventListener("schedule_changed", () => {
      refreshSchedules();
    });
    stream.addEventListener("shift_changed", () => {
      refreshShifts();
      refreshAssignments();
    });
    stream.addEventListener("assignment_changed", () => {
      refreshAssignments();
    });
    stream.addEventListener("swap_changed", () => {
      refreshSwaps();
    });
    stream.addEventListener("clock_changed", () => {
      refreshAssignments();
    });
    stream.addEventListener("notification_created", (event) => {
      const payload = parseEventPayload(event?.data);
      if (payload?.notification_id && inAppEnabled) {
        dispatch(
          prependNotification({
            _id: payload.notification_id,
            title: payload.title || "Notification",
            message: payload.message || "",
            status: "unread",
            category: payload.category || "general",
            createdAt: payload.createdAt || new Date().toISOString(),
            data: payload || {},
          })
        );
      }
      dispatch(fetchUnreadCount(userId));
    });

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      broadcastRealtimeStatus("offline");
      stream.close();
    };
  }, [canViewOnDuty, dispatch, inAppEnabled, userId]);

  useEffect(() => {
    let unsubscribe = () => {};
    let mounted = true;

    const subscribe = async () => {
      const detach = await subscribeForegroundPush((payload) => {
        if (!mounted) return;
        if (!inAppEnabled) return;
        const title = payload?.notification?.title || "New notification";
        const message = payload?.notification?.body || "";
        const link = ensureLeadingSlash(payload?.data?.link || payload?.fcmOptions?.link);
        const synthetic = {
          _id: `foreground_${Date.now()}`,
          title,
          message,
          status: "unread",
          category: payload?.data?.category || "push",
          link,
          createdAt: new Date().toISOString(),
          data: payload?.data || {},
        };
        dispatch(prependNotification(synthetic));
        dispatch(fetchUnreadCount(userId));

        toast(title, {
          description: message,
          action: link
            ? {
                label: "Open",
                onClick: () => {
                  if (link.startsWith("http")) {
                    window.open(link, "_blank", "noopener,noreferrer");
                  } else {
                    const pathOnly = link.split("?")[0];
                    if (pathOnly === "/schedule") {
                      const scheduleId = String(
                        extractScheduleIdFromLink(link) || extractScheduleId(payload?.data || {})
                      );
                      navigate("/schedule", {
                        state: {
                          openDrawer: true,
                          ...(scheduleId ? { scheduleId } : {}),
                        },
                      });
                    } else {
                      navigate(link);
                    }
                  }
                },
              }
            : undefined,
        });
      });
      unsubscribe = detach || (() => {});
    };

    subscribe();

    const swClickHandler = (event) => {
      if (event?.data?.type !== "notification_click") return;
      const link = ensureLeadingSlash(event?.data?.link);
      if (!link) return;
      const pathOnly = link.split("?")[0];
      if (pathOnly === "/schedule") {
        const scheduleId = String(
          extractScheduleIdFromLink(link) || extractScheduleId(event?.data || {})
        );
        navigate("/schedule", {
          state: {
            openDrawer: true,
            ...(scheduleId ? { scheduleId } : {}),
          },
        });
        return;
      }
      navigate(link);
    };
    navigator.serviceWorker?.addEventListener("message", swClickHandler);

    return () => {
      mounted = false;
      unsubscribe();
      navigator.serviceWorker?.removeEventListener("message", swClickHandler);
    };
  }, [dispatch, navigate, userId, inAppEnabled]);

  return null;
};

export default NotificationsBootstrap;
