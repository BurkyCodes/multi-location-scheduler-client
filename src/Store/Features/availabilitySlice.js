import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";

const initialState = { byUser: {}, loading: false, saving: false, error: null };

export const upsertAvailability = createAsyncThunk(
  "availability/upsertAvailability",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/availabilities", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to save availability"));
    }
  },
);

export const fetchAvailabilityByUser = createAsyncThunk(
  "availability/fetchAvailabilityByUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/availabilities/user/${userId}`);
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch user availability"));
    }
  },
);

export const deleteAvailabilityByUser = createAsyncThunk(
  "availability/deleteAvailabilityByUser",
  async (userId, { rejectWithValue }) => {
    try {
      await apiRequest(`/availabilities/user/${userId}`, { method: "DELETE" });
      return userId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete user availability"));
    }
  },
);

const availabilitySlice = createSlice({
  name: "availability",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(upsertAvailability.pending, (state) => {
        state.saving = true;
      })
      .addCase(upsertAvailability.fulfilled, (state, action) => {
        state.saving = false;
        const doc = action.payload;
        if (doc?.user_id) state.byUser[doc.user_id] = doc;
      })
      .addCase(upsertAvailability.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(fetchAvailabilityByUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAvailabilityByUser.fulfilled, (state, action) => {
        state.loading = false;
        const doc = action.payload;
        if (doc?.user_id) state.byUser[doc.user_id] = doc;
      })
      .addCase(fetchAvailabilityByUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAvailabilityByUser.fulfilled, (state, action) => {
        delete state.byUser[action.payload];
      });
  },
});

export default availabilitySlice.reducer;

