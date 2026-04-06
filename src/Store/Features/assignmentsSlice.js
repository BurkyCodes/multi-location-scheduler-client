import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

const initialState = {
  list: [],
  selected: null,
  loading: false,
  saving: false,
  recommendations: [],
  recommendationsShiftId: "",
  recommendationsLoading: false,
  myTracking: {
    now_utc: null,
    active_assignment: null,
    assignments: [],
  },
  onDutyNow: {
    now_utc: null,
    total_on_duty: 0,
    locations: [],
  },
  onDutyNowLoading: false,
  myTrackingLoading: false,
  quickActionLoading: false,
  error: null,
};

const getAssignmentErrorPayload = (error, fallback) => {
  if (error?.details && typeof error.details === "object") return error.details;
  return getErrorMessage(error, fallback);
};

export const fetchAssignments = createAsyncThunk(
  "assignments/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/assignments");
      return response?.data || [];
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to fetch assignments"));
    }
  },
);

export const createAssignment = createAsyncThunk(
  "assignments/createOne",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return {
        data: response?.data || null,
        warnings: response?.warnings || [],
        labor_alerts: response?.labor_alerts || [],
      };
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to create assignment"));
    }
  },
);

export const updateAssignment = createAsyncThunk(
  "assignments/updateOne",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return {
        data: response?.data || null,
        warnings: response?.warnings || [],
        labor_alerts: response?.labor_alerts || [],
      };
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to update assignment"));
    }
  },
);

export const deleteAssignment = createAsyncThunk(
  "assignments/deleteOne",
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest(`/assignments/${id}`, { method: "DELETE" });
      return id;
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to delete assignment"));
    }
  },
);

export const fetchCoverageRecommendations = createAsyncThunk(
  "assignments/fetchCoverageRecommendations",
  async ({ shiftId, limit = 5 }, { rejectWithValue }) => {
    try {
      if (!shiftId) return { shiftId: "", recommendations: [] };
      const response = await apiRequest(
        `/assignments/coverage/${shiftId}?limit=${encodeURIComponent(limit)}`,
      );
      const recommendations = response?.recommendations || response?.suggestions || [];
      return { shiftId, recommendations };
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to fetch recommendations"));
    }
  },
);

export const fetchMyShiftTracking = createAsyncThunk(
  "assignments/fetchMyShiftTracking",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/assignments/my/tracking");
      return response?.data || { now_utc: null, active_assignment: null, assignments: [] };
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to fetch shift tracking"));
    }
  },
);

export const fetchOnDutyNow = createAsyncThunk(
  "assignments/fetchOnDutyNow",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/assignments/on-duty-now");
      return response || { now_utc: null, total_on_duty: 0, locations: [] };
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to fetch on-duty staff"));
    }
  },
);

export const clockInAssignmentQuick = createAsyncThunk(
  "assignments/clockInQuick",
  async ({ assignmentId, note } = {}, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/assignments/${assignmentId}/clock-in`, {
        method: "POST",
        body: JSON.stringify(note ? { note } : {}),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to clock in"));
    }
  },
);

export const pauseAssignmentQuick = createAsyncThunk(
  "assignments/pauseQuick",
  async ({ assignmentId, reason = "Break" } = {}, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/assignments/${assignmentId}/pause`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to pause shift"));
    }
  },
);

export const resumeAssignmentQuick = createAsyncThunk(
  "assignments/resumeQuick",
  async ({ assignmentId, note } = {}, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/assignments/${assignmentId}/resume`, {
        method: "POST",
        body: JSON.stringify(note ? { note } : {}),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to resume shift"));
    }
  },
);

export const clockOutAssignmentQuick = createAsyncThunk(
  "assignments/clockOutQuick",
  async ({ assignmentId, note } = {}, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/assignments/${assignmentId}/clock-out`, {
        method: "POST",
        body: JSON.stringify(note ? { note } : {}),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getAssignmentErrorPayload(error, "Failed to clock out"));
    }
  },
);

export const recoverClockOutAssignmentQuick = createAsyncThunk(
  "assignments/recoverClockOutQuick",
  async ({ assignmentId, reason, clock_out_utc } = {}, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/assignments/${assignmentId}/recover-clock-out`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          ...(clock_out_utc ? { clock_out_utc } : {}),
        }),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(
        getAssignmentErrorPayload(error, "Failed to recover missing clock-out"),
      );
    }
  },
);

const assignmentsSlice = createSlice({
  name: "assignments",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelected: (state, action) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAssignment.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload?.data) state.list.unshift(action.payload.data);
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateAssignment.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAssignment.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload?.data;
        if (!updated) return;
        const updatedId = getId(updated);
        state.list = state.list.map((item) => (getId(item) === updatedId ? updated : item));
        if (state.selected && getId(state.selected) === updatedId) {
          state.selected = updated;
        }
      })
      .addCase(updateAssignment.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteAssignment.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteAssignment.fulfilled, (state, action) => {
        state.saving = false;
        state.list = state.list.filter((item) => getId(item) !== action.payload);
        if (state.selected && getId(state.selected) === action.payload) {
          state.selected = null;
        }
      })
      .addCase(deleteAssignment.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(fetchCoverageRecommendations.pending, (state) => {
        state.recommendationsLoading = true;
        state.recommendations = [];
      })
      .addCase(fetchCoverageRecommendations.fulfilled, (state, action) => {
        state.recommendationsLoading = false;
        state.recommendationsShiftId = action.payload?.shiftId || "";
        state.recommendations = action.payload?.recommendations || [];
      })
      .addCase(fetchCoverageRecommendations.rejected, (state, action) => {
        state.recommendationsLoading = false;
        state.recommendations = [];
        state.error = action.payload || state.error;
      })
      .addCase(fetchMyShiftTracking.pending, (state) => {
        state.myTrackingLoading = true;
      })
      .addCase(fetchMyShiftTracking.fulfilled, (state, action) => {
        state.myTrackingLoading = false;
        state.myTracking = action.payload || {
          now_utc: null,
          active_assignment: null,
          assignments: [],
        };
      })
      .addCase(fetchMyShiftTracking.rejected, (state, action) => {
        state.myTrackingLoading = false;
        state.myTracking = { now_utc: null, active_assignment: null, assignments: [] };
        state.error = action.payload || state.error;
      })
      .addCase(fetchOnDutyNow.pending, (state) => {
        state.onDutyNowLoading = true;
      })
      .addCase(fetchOnDutyNow.fulfilled, (state, action) => {
        state.onDutyNowLoading = false;
        state.onDutyNow = action.payload || {
          now_utc: null,
          total_on_duty: 0,
          locations: [],
        };
      })
      .addCase(fetchOnDutyNow.rejected, (state, action) => {
        state.onDutyNowLoading = false;
        state.onDutyNow = { now_utc: null, total_on_duty: 0, locations: [] };
        state.error = action.payload || state.error;
      })
      .addCase(clockInAssignmentQuick.pending, (state) => {
        state.quickActionLoading = true;
      })
      .addCase(clockInAssignmentQuick.fulfilled, (state) => {
        state.quickActionLoading = false;
      })
      .addCase(clockInAssignmentQuick.rejected, (state, action) => {
        state.quickActionLoading = false;
        state.error = action.payload || state.error;
      })
      .addCase(pauseAssignmentQuick.pending, (state) => {
        state.quickActionLoading = true;
      })
      .addCase(pauseAssignmentQuick.fulfilled, (state) => {
        state.quickActionLoading = false;
      })
      .addCase(pauseAssignmentQuick.rejected, (state, action) => {
        state.quickActionLoading = false;
        state.error = action.payload || state.error;
      })
      .addCase(resumeAssignmentQuick.pending, (state) => {
        state.quickActionLoading = true;
      })
      .addCase(resumeAssignmentQuick.fulfilled, (state) => {
        state.quickActionLoading = false;
      })
      .addCase(resumeAssignmentQuick.rejected, (state, action) => {
        state.quickActionLoading = false;
        state.error = action.payload || state.error;
      })
      .addCase(clockOutAssignmentQuick.pending, (state) => {
        state.quickActionLoading = true;
      })
      .addCase(clockOutAssignmentQuick.fulfilled, (state) => {
        state.quickActionLoading = false;
      })
      .addCase(clockOutAssignmentQuick.rejected, (state, action) => {
        state.quickActionLoading = false;
        state.error = action.payload || state.error;
      })
      .addCase(recoverClockOutAssignmentQuick.pending, (state) => {
        state.quickActionLoading = true;
      })
      .addCase(recoverClockOutAssignmentQuick.fulfilled, (state) => {
        state.quickActionLoading = false;
      })
      .addCase(recoverClockOutAssignmentQuick.rejected, (state, action) => {
        state.quickActionLoading = false;
        state.error = action.payload || state.error;
      });
  },
});

export const {
  clearError: clearAssignmentsError,
  setSelected: setSelectedAssignment,
} = assignmentsSlice.actions;

export default assignmentsSlice.reducer;
