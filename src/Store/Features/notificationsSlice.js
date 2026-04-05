import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

const initialState = {
  list: [],
  unreadCount: 0,
  loading: false,
  saving: false,
  error: null,
  pagination: null,
};

export const fetchNotificationsFeed = createAsyncThunk(
  "notifications/fetchNotificationsFeed",
  async ({ orgUserId, page = 1, limit = 20, status, category } = {}, { rejectWithValue }) => {
    try {
      if (!orgUserId) return { data: [], pagination: null };
      const search = new URLSearchParams();
      search.set("page", String(page));
      search.set("limit", String(limit));
      if (status) search.set("status", status);
      if (category) search.set("category", category);
      const response = await apiRequest(`/notifications/feed/${orgUserId}?${search.toString()}`);
      return {
        data: response?.data || [],
        pagination: response?.pagination || null,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch notifications"));
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (orgUserId, { rejectWithValue }) => {
    try {
      if (!orgUserId) return 0;
      const response = await apiRequest(`/notifications/feed/${orgUserId}/unread-count`);
      return Number(response?.unread_count || 0);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch unread count"));
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markNotificationRead",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to mark notification as read"));
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllNotificationsRead",
  async (orgUserId, { rejectWithValue }) => {
    try {
      if (!orgUserId) return { modified_count: 0 };
      return await apiRequest(`/notifications/feed/read-all/${orgUserId}`, {
        method: "PUT",
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to mark all notifications as read"));
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteNotification",
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest(`/notifications/feed/${id}`, { method: "DELETE" });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete notification"));
    }
  }
);

export const clearNotifications = createAsyncThunk(
  "notifications/clearNotifications",
  async (ids = [], { rejectWithValue }) => {
    try {
      const uniqueIds = [...new Set((ids || []).filter(Boolean))];
      await Promise.all(
        uniqueIds.map((id) => apiRequest(`/notifications/feed/${id}`, { method: "DELETE" }))
      );
      return uniqueIds;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to clear notifications"));
    }
  }
);

export const registerPushToken = createAsyncThunk(
  "notifications/registerPushToken",
  async (
    { org_user_id, fcm_token, device_type = "web", device_name = "browser", garage_id } = {},
    { rejectWithValue }
  ) => {
    try {
      if (!org_user_id || !fcm_token) return { skipped: true };
      return await apiRequest("/notifications/push/register", {
        method: "POST",
        body: JSON.stringify({ org_user_id, fcm_token, device_type, device_name, garage_id }),
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to register push token"));
    }
  }
);

export const unregisterPushToken = createAsyncThunk(
  "notifications/unregisterPushToken",
  async ({ fcm_token } = {}, { rejectWithValue }) => {
    try {
      if (!fcm_token) return { skipped: true };
      return await apiRequest("/notifications/push/unregister", {
        method: "POST",
        body: JSON.stringify({ fcm_token }),
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to unregister push token"));
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    prependNotification: (state, action) => {
      const notification = action.payload;
      if (!notification) return;
      state.list = [notification, ...state.list];
      if (notification?.status !== "read" && notification?.status !== "deleted") {
        state.unreadCount += 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationsFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationsFeed.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload?.data || [];
        state.pagination = action.payload?.pagination || null;
      })
      .addCase(fetchNotificationsFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = Number(action.payload || 0);
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = getId(updated);
        state.list = state.list.map((item) => (getId(item) === id ? updated : item));
        state.unreadCount = Math.max(
          0,
          state.list.filter((item) => item?.status === "unread").length
        );
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.list = state.list.map((item) =>
          item?.status === "unread" ? { ...item, status: "read" } : item
        );
        state.unreadCount = 0;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const id = String(action.payload || "");
        state.list = state.list.filter((item) => String(getId(item)) !== id);
        state.unreadCount = Math.max(
          0,
          state.list.filter((item) => item?.status === "unread").length
        );
      })
      .addCase(clearNotifications.fulfilled, (state, action) => {
        const deletedIds = new Set((action.payload || []).map(String));
        state.list = state.list.filter((item) => !deletedIds.has(String(getId(item))));
        state.unreadCount = Math.max(
          0,
          state.list.filter((item) => item?.status === "unread").length
        );
      })
      .addMatcher(
        (action) =>
          action.type.startsWith("notifications/") &&
          action.type.endsWith("/pending") &&
          !action.type.includes("fetchNotificationsFeed") &&
          !action.type.includes("fetchUnreadCount"),
        (state) => {
          state.saving = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("notifications/") &&
          action.type.endsWith("/fulfilled") &&
          !action.type.includes("fetchNotificationsFeed") &&
          !action.type.includes("fetchUnreadCount"),
        (state) => {
          state.saving = false;
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("notifications/") &&
          action.type.endsWith("/rejected"),
        (state, action) => {
          state.saving = false;
          state.error = action.payload;
        }
      );
  },
});

export const { prependNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
