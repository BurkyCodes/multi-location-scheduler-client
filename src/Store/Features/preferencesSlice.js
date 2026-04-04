import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";

const initialState = {
  staffByUser: {},
  notificationsByUser: {},
  loading: false,
  saving: false,
  error: null,
};

export const upsertStaffPreference = createAsyncThunk(
  "preferences/upsertStaffPreference",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/preferences/staff", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to save staff preference"));
    }
  },
);

export const fetchStaffPreferenceByUser = createAsyncThunk(
  "preferences/fetchStaffPreferenceByUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/preferences/staff/user/${userId}`);
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch staff preference"));
    }
  },
);

export const upsertNotificationPreference = createAsyncThunk(
  "preferences/upsertNotificationPreference",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/preferences/notifications", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to save notification preference"));
    }
  },
);

export const fetchNotificationPreferenceByUser = createAsyncThunk(
  "preferences/fetchNotificationPreferenceByUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/preferences/notifications/user/${userId}`);
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch notification preference"));
    }
  },
);

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(upsertStaffPreference.fulfilled, (state, action) => {
        const doc = action.payload;
        if (doc?.user_id) state.staffByUser[doc.user_id] = doc;
      })
      .addCase(fetchStaffPreferenceByUser.fulfilled, (state, action) => {
        const doc = action.payload;
        if (doc?.user_id) state.staffByUser[doc.user_id] = doc;
      })
      .addCase(upsertNotificationPreference.fulfilled, (state, action) => {
        const doc = action.payload;
        if (doc?.user_id) state.notificationsByUser[doc.user_id] = doc;
      })
      .addCase(fetchNotificationPreferenceByUser.fulfilled, (state, action) => {
        const doc = action.payload;
        if (doc?.user_id) state.notificationsByUser[doc.user_id] = doc;
      })
      .addMatcher(
        (action) => action.type.startsWith("preferences/") && action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith("preferences/") && action.type.endsWith("/fulfilled"),
        (state) => {
          state.loading = false;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith("preferences/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export default preferencesSlice.reducer;

