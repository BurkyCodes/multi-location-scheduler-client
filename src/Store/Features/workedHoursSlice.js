import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";

const initialState = {
  period: "week",
  from: null,
  to: null,
  list: [],
  insights: null,
  loading: false,
  insightsLoading: false,
  error: null,
};

export const fetchWorkedHours = createAsyncThunk(
  "workedHours/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params.period) query.set("period", params.period);
      if (params.from) query.set("from", params.from);
      if (params.to) query.set("to", params.to);
      if (params.user_id) query.set("user_id", params.user_id);
      const response = await apiRequest(`/assignments/worked-hours?${query.toString()}`);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch worked hours"));
    }
  }
);

export const fetchAssignmentInsights = createAsyncThunk(
  "workedHours/fetchInsights",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params.from) query.set("from", params.from);
      if (params.to) query.set("to", params.to);
      if (params.shift_id) query.set("shift_id", params.shift_id);
      if (params.user_id) query.set("user_id", params.user_id);
      const response = await apiRequest(`/assignments/insights?${query.toString()}`);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch assignment insights"));
    }
  }
);

const workedHoursSlice = createSlice({
  name: "workedHours",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkedHours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkedHours.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload?.data || [];
        state.period = action.payload?.period || state.period;
        state.from = action.payload?.from || state.from;
        state.to = action.payload?.to || state.to;
      })
      .addCase(fetchWorkedHours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAssignmentInsights.pending, (state) => {
        state.insightsLoading = true;
      })
      .addCase(fetchAssignmentInsights.fulfilled, (state, action) => {
        state.insightsLoading = false;
        state.insights = action.payload?.scenarios || null;
      })
      .addCase(fetchAssignmentInsights.rejected, (state, action) => {
        state.insightsLoading = false;
        state.error = action.payload;
      });
  },
});

export default workedHoursSlice.reducer;

