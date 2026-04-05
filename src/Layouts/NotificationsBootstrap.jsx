import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchUnreadCount,
  prependNotification,
  registerPushToken,
  unregisterPushToken,
} from "../Store/Features/notificationsSlice";
import { getWebPushToken, subscribeForegroundPush } from "../Services/pushNotifications";
import { fetchNotificationPreferenceByUser } from "../Store/Features/preferencesSlice";

const ensureLeadingSlash = (path) => {
  if (!path) return "";
  if (String(path).startsWith("http://") || String(path).startsWith("https://")) return path;
  return String(path).startsWith("/") ? path : `/${path}`;
};

const NotificationsBootstrap = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const notificationPrefs = useSelector((state) =>
    state.preferences.notificationsByUser[String(userId || "")]
  );
  const inAppEnabled = Boolean(
    notificationPrefs?.channels?.in_app ??
      notificationPrefs?.in_app_enabled ??
      notificationPrefs?.channels?.email ??
      notificationPrefs?.email_enabled ??
      notificationPrefs?.email
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
                    navigate(link);
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
