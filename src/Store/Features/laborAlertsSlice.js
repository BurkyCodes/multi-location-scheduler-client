import { createCrudSlice } from "./createCrudSlice";

const laborAlertsCrud = createCrudSlice({ name: "laborAlerts", basePath: "/labor-alerts" });

export const fetchLaborAlerts = laborAlertsCrud.thunks.fetchAll;
export const createLaborAlert = laborAlertsCrud.thunks.createOne;
export const updateLaborAlert = laborAlertsCrud.thunks.updateOne;
export const deleteLaborAlert = laborAlertsCrud.thunks.deleteOne;

export default laborAlertsCrud.reducer;

