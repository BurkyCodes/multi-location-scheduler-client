import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

const initialState = { list: [], loading: false, saving: false, error: null };

export const fetchSwapRequests = createAsyncThunk(
  "swapRequests/fetchSwapRequests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/swap-requests");
      return response?.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch swap requests"));
    }
  },
);

export const cancelSwapRequest = createAsyncThunk(
  "swapRequests/cancelSwapRequest",
  async ({ id, cancelled_reason }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/swap-requests/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ cancelled_reason }),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to cancel swap request"));
    }
  },
);

export const createSwapRequest = createAsyncThunk(
  "swapRequests/createSwapRequest",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/swap-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to create swap request"));
    }
  },
);

export const managerDecisionSwapRequest = createAsyncThunk(
  "swapRequests/managerDecisionSwapRequest",
  async ({ id, approve, manager_id }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/swap-requests/${id}/manager-decision`, {
        method: "POST",
        body: JSON.stringify({ approve, manager_id }),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed manager decision for swap request"));
    }
  },
);

const swapRequestsSlice = createSlice({
  name: "swapRequests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSwapRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSwapRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchSwapRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSwapRequest.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createSwapRequest.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) state.list.unshift(action.payload);
      })
      .addCase(createSwapRequest.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(cancelSwapRequest.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = getId(updated);
        state.list = state.list.map((item) => (getId(item) === id ? updated : item));
      })
      .addCase(managerDecisionSwapRequest.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = getId(updated);
        state.list = state.list.map((item) => (getId(item) === id ? updated : item));
      });
  },
});

export default swapRequestsSlice.reducer;
