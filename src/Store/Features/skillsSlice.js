import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";

const initialState = {
  skills: [],
  staffSkills: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchSkills = createAsyncThunk("skills/fetchSkills", async (_, { rejectWithValue }) => {
  try {
    const response = await apiRequest("/skills");
    return response?.data || [];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch skills"));
  }
});

export const fetchStaffSkills = createAsyncThunk(
  "skills/fetchStaffSkills",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/skills/staff/all");
      return response?.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch staff skills"));
    }
  },
);

const skillsSlice = createSlice({
  name: "skills",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSkills.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSkills.fulfilled, (state, action) => {
        state.loading = false;
        state.skills = action.payload;
      })
      .addCase(fetchSkills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchStaffSkills.fulfilled, (state, action) => {
        state.staffSkills = action.payload;
      });
  },
});

export default skillsSlice.reducer;

