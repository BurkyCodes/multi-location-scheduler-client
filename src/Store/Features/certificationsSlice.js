import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "../../Services/apiClient";
import { getErrorMessage } from "./sliceUtils";
import { createCrudSlice } from "./createCrudSlice";

const certificationsCrud = createCrudSlice({
  name: "certifications",
  basePath: "/certifications",
});

export const fetchCertifications = certificationsCrud.thunks.fetchAll;
export const createCertification = certificationsCrud.thunks.createOne;
export const updateCertification = certificationsCrud.thunks.updateOne;
export const deleteCertification = certificationsCrud.thunks.deleteOne;
export const decertifyCertification = createAsyncThunk(
  "certifications/decertify",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(`/certifications/${id}/decertify`, {
        method: "PATCH",
        body: JSON.stringify(reason ? { reason } : {}),
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to decertify staff"));
    }
  }
);

export default certificationsCrud.reducer;
