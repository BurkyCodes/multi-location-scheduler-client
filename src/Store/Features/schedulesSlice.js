import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

const initialState = { list: [], loading: false, saving: false, error: null };

export const fetchSchedules = createAsyncThunk("schedules/fetchSchedules", async (_, { rejectWithValue }) => {
  try {
    const response = await apiRequest("/schedules");
    return response?.data || [];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch schedules"));
  }
});

export const createSchedule = createAsyncThunk("schedules/createSchedule", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiRequest("/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response?.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create schedule"));
  }
});

export const updateSchedule = createAsyncThunk(
  "schedules/updateSchedule",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to update schedule"));
    }
  },
);

export const deleteSchedule = createAsyncThunk("schedules/deleteSchedule", async (id, { rejectWithValue }) => {
  try {
    await apiRequest(`/schedules/${id}`, { method: "DELETE" });
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to delete schedule"));
  }
});

export const publishSchedule = createAsyncThunk(
  "schedules/publishSchedule",
  async ({ id, published_by }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/schedules/${id}/publish`, {
        method: "POST",
        body: JSON.stringify({ published_by }),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to publish schedule"));
    }
  },
);

export const unpublishSchedule = createAsyncThunk(
  "schedules/unpublishSchedule",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/schedules/${id}/unpublish`, { method: "POST" });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to unpublish schedule"));
    }
  },
);

const upsertSchedule = (state, payload) => {
  const id = getId(payload);
  const existing = state.list.findIndex((item) => getId(item) === id);
  if (existing === -1) state.list.unshift(payload);
  else state.list[existing] = payload;
};

const schedulesSlice = createSlice({
  name: "schedules",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSchedule.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createSchedule.fulfilled, (state, action) => {
        state.saving = false;
        upsertSchedule(state, action.payload);
      })
      .addCase(createSchedule.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        upsertSchedule(state, action.payload);
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => getId(item) !== action.payload);
      })
      .addCase(publishSchedule.fulfilled, (state, action) => {
        upsertSchedule(state, action.payload);
      })
      .addCase(unpublishSchedule.fulfilled, (state, action) => {
        upsertSchedule(state, action.payload);
      });
  },
});

export default schedulesSlice.reducer;

