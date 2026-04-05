import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";

const initialState = { list: [], loading: false, saving: false, error: null };

export const fetchAuditLogs = createAsyncThunk(
  "auditLogs/fetchAuditLogs",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await apiRequest(`/audit-logs${query ? `?${query}` : ""}`);
      return response?.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch audit logs"));
    }
  },
);

export const createAuditLog = createAsyncThunk(
  "auditLogs/createAuditLog",
  async (payload, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const authUser = state?.auth?.user;
      const actorUserId = payload?.actor_user_id || authUser?._id || authUser?.id;
      if (!actorUserId) {
        return rejectWithValue("Actor user is required");
      }

      const requestBody = {
        ...payload,
        actor_user_id: actorUserId,
      };

      if (payload?.metadata && !payload?.after_state) {
        requestBody.after_state = payload.metadata;
      }
      if (payload?.module && !payload?.reason) {
        requestBody.reason = `module:${payload.module}`;
      }

      const response = await apiRequest("/audit-logs", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to create audit log"));
    }
  },
);

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAuditLog.pending, (state) => {
        state.saving = true;
      })
      .addCase(createAuditLog.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) state.list.unshift(action.payload);
      })
      .addCase(createAuditLog.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export default auditLogsSlice.reducer;
