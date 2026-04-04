import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";

const initialState = {
  user: null,
  accessToken: localStorage.getItem("access_token") || null,
  refreshToken: localStorage.getItem("refresh_token") || null,
  isAuthenticated: Boolean(localStorage.getItem("access_token")),
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk("auth/loginUser", async (payload, { rejectWithValue }) => {
  try {
    return await apiRequest("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to login"));
  }
});

export const fetchProfile = createAsyncThunk("auth/fetchProfile", async (_, { rejectWithValue }) => {
  try {
    return await apiRequest("/v1/auth/profile");
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch profile"));
  }
});

export const verifyPhoneNumber = createAsyncThunk(
  "auth/verifyPhoneNumber",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest("/v1/auth/verify-number", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Phone verification failed"));
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  return true;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setAuthTokens: (state, action) => {
      const { accessToken, refreshToken } = action.payload || {};
      state.accessToken = accessToken || null;
      state.refreshToken = refreshToken || null;
      state.isAuthenticated = Boolean(accessToken);
      if (accessToken) localStorage.setItem("access_token", accessToken);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || null;
        state.accessToken = action.payload?.accessToken || null;
        state.refreshToken = action.payload?.refreshToken || null;
        state.isAuthenticated = Boolean(action.payload?.accessToken);
        if (action.payload?.accessToken) {
          localStorage.setItem("access_token", action.payload.accessToken);
        }
        if (action.payload?.refreshToken) {
          localStorage.setItem("refresh_token", action.payload.refreshToken);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyPhoneNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPhoneNumber.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyPhoneNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearAuthError, setAuthTokens } = authSlice.actions;
export default authSlice.reducer;

