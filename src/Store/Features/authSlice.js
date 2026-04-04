import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";
import { Cookies } from "../../Services/cookies";

const initialState = {
  user: null,
  accessToken: Cookies.get("access_token") || localStorage.getItem("access_token") || null,
  refreshToken: Cookies.get("refresh_token") || localStorage.getItem("refresh_token") || null,
  isAuthenticated: Boolean(Cookies.get("access_token") || localStorage.getItem("access_token")),
  loading: false,
  error: null,
};

export const tokenConfig = () => {
  const accessToken = Cookies.get("access_token");
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
};

export const login = createAsyncThunk("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const data = await apiRequest("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const accessToken = data?.accessToken;
    const refreshToken = data?.refreshToken;
    const roleId = data?.user?.role_id;

    if (accessToken) Cookies.set("access_token", accessToken, { expires: 7, secure: true });
    if (refreshToken) Cookies.set("refresh_token", refreshToken, { expires: 7, secure: true });
    if (roleId) Cookies.set("role_id", typeof roleId === "string" ? roleId : roleId?._id || "", { expires: 7, secure: true });

    if (accessToken) localStorage.setItem("access_token", accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);

    return data;
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

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await apiRequest("/v1/auth/logout", {
      method: "DELETE",
      ...tokenConfig(),
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Logout failed"));
  } finally {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("role_id");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
  return true;
});

export const verifyAuth = createAsyncThunk("auth/verifyAuth", async (_, { rejectWithValue }) => {
  try {
    const data = await apiRequest("/v1/auth/verify", {
      method: "GET",
      ...tokenConfig(),
    });
    return data;
  } catch (error) {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("role_id");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return rejectWithValue(getErrorMessage(error, "Session verification failed"));
  }
});

// Backward-compatible aliases for existing imports.
export const loginUser = login;
export const logoutUser = logout;

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
      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
        Cookies.set("access_token", accessToken, { expires: 7, secure: true });
      }
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
        Cookies.set("refresh_token", refreshToken, { expires: 7, secure: true });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || null;
        state.accessToken = action.payload?.accessToken || null;
        state.refreshToken = action.payload?.refreshToken || null;
        state.isAuthenticated = Boolean(action.payload?.accessToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
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
      .addCase(verifyAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || action.payload?.data?.user || state.user;
        state.isAuthenticated = Boolean(state.accessToken || Cookies.get("access_token"));
      })
      .addCase(verifyAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearAuthError, setAuthTokens } = authSlice.actions;
export default authSlice.reducer;
