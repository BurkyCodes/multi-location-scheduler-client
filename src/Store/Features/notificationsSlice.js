import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

const initialState = { list: [], loading: false, saving: false, error: null };

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/notifications");
      return response?.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch notifications"));
    }
  },
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
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = getId(updated);
        state.list = state.list.map((item) => (getId(item) === id ? updated : item));
      });
  },
});

export default notificationsSlice.reducer;

