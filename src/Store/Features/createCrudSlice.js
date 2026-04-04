import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage, getId } from "./sliceUtils";

export const createCrudSlice = ({ name, basePath }) => {
  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest(basePath);
      return response?.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, `Failed to fetch ${name}`));
    }
  });

  const createOne = createAsyncThunk(`${name}/createOne`, async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(basePath, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, `Failed to create ${name}`));
    }
  });

  const updateOne = createAsyncThunk(
    `${name}/updateOne`,
    async ({ id, ...payload }, { rejectWithValue }) => {
      try {
        const response = await apiRequest(`${basePath}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        return response?.data;
      } catch (error) {
        return rejectWithValue(getErrorMessage(error, `Failed to update ${name}`));
      }
    },
  );

  const deleteOne = createAsyncThunk(`${name}/deleteOne`, async (id, { rejectWithValue }) => {
    try {
      await apiRequest(`${basePath}/${id}`, { method: "DELETE" });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, `Failed to delete ${name}`));
    }
  });

  const slice = createSlice({
    name,
    initialState: {
      list: [],
      selected: null,
      loading: false,
      saving: false,
      error: null,
    },
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
        .addCase(fetchAll.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchAll.fulfilled, (state, action) => {
          state.loading = false;
          state.list = action.payload;
        })
        .addCase(fetchAll.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        })
        .addCase(createOne.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(createOne.fulfilled, (state, action) => {
          state.saving = false;
          if (action.payload) state.list.unshift(action.payload);
        })
        .addCase(createOne.rejected, (state, action) => {
          state.saving = false;
          state.error = action.payload;
        })
        .addCase(updateOne.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(updateOne.fulfilled, (state, action) => {
          state.saving = false;
          const updated = action.payload;
          const updatedId = getId(updated);
          state.list = state.list.map((item) => (getId(item) === updatedId ? updated : item));
          if (state.selected && getId(state.selected) === updatedId) {
            state.selected = updated;
          }
        })
        .addCase(updateOne.rejected, (state, action) => {
          state.saving = false;
          state.error = action.payload;
        })
        .addCase(deleteOne.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(deleteOne.fulfilled, (state, action) => {
          state.saving = false;
          state.list = state.list.filter((item) => getId(item) !== action.payload);
          if (state.selected && getId(state.selected) === action.payload) {
            state.selected = null;
          }
        })
        .addCase(deleteOne.rejected, (state, action) => {
          state.saving = false;
          state.error = action.payload;
        });
    },
  });

  return {
    reducer: slice.reducer,
    actions: slice.actions,
    thunks: { fetchAll, createOne, updateOne, deleteOne },
  };
};

