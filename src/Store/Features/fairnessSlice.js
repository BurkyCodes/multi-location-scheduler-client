import { createCrudSlice } from "./createCrudSlice";

const fairnessCrud = createCrudSlice({
  name: "fairnessSnapshots",
  basePath: "/fairness-snapshots",
});

export const fetchFairnessSnapshots = fairnessCrud.thunks.fetchAll;
export const createFairnessSnapshot = fairnessCrud.thunks.createOne;
export const updateFairnessSnapshot = fairnessCrud.thunks.updateOne;
export const deleteFairnessSnapshot = fairnessCrud.thunks.deleteOne;

export default fairnessCrud.reducer;

