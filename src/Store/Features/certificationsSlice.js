import { createCrudSlice } from "./createCrudSlice";

const certificationsCrud = createCrudSlice({
  name: "certifications",
  basePath: "/certifications",
});

export const fetchCertifications = certificationsCrud.thunks.fetchAll;
export const createCertification = certificationsCrud.thunks.createOne;
export const updateCertification = certificationsCrud.thunks.updateOne;
export const deleteCertification = certificationsCrud.thunks.deleteOne;

export default certificationsCrud.reducer;

