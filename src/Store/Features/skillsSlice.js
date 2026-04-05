import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

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

export const createSkill = createAsyncThunk("skills/createSkill", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiRequest("/skills", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response?.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create skill"));
  }
});

export const updateSkill = createAsyncThunk(
  "skills/updateSkill",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/skills/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to update skill"));
    }
  },
);

export const deleteSkill = createAsyncThunk("skills/deleteSkill", async (id, { rejectWithValue }) => {
  try {
    await apiRequest(`/skills/${id}`, { method: "DELETE" });
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to delete skill"));
  }
});

export const createStaffSkill = createAsyncThunk(
  "skills/createStaffSkill",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest("/skills/staff", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to add staff skill"));
    }
  },
);

export const deleteStaffSkill = createAsyncThunk(
  "skills/deleteStaffSkill",
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest(`/skills/staff/${id}`, { method: "DELETE" });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to remove staff skill"));
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
      .addCase(fetchStaffSkills.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStaffSkills.fulfilled, (state, action) => {
        state.loading = false;
        state.staffSkills = action.payload;
      })
      .addCase(fetchStaffSkills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSkill.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createSkill.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) state.skills.unshift(action.payload);
      })
      .addCase(createSkill.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateSkill.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateSkill.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        const updatedId = getId(updated);
        state.skills = state.skills.map((item) => (getId(item) === updatedId ? updated : item));
      })
      .addCase(updateSkill.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteSkill.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteSkill.fulfilled, (state, action) => {
        state.saving = false;
        state.skills = state.skills.filter((item) => getId(item) !== action.payload);
      })
      .addCase(deleteSkill.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(createStaffSkill.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createStaffSkill.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) state.staffSkills.unshift(action.payload);
      })
      .addCase(createStaffSkill.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteStaffSkill.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteStaffSkill.fulfilled, (state, action) => {
        state.saving = false;
        state.staffSkills = state.staffSkills.filter((item) => getId(item) !== action.payload);
      })
      .addCase(deleteStaffSkill.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export default skillsSlice.reducer;
