import { createCrudSlice } from "./createCrudSlice";

const staffCrud = createCrudSlice({ name: "staff", basePath: "/users" });

export const fetchStaff = staffCrud.thunks.fetchAll;
export const createStaff = staffCrud.thunks.createOne;
export const updateStaff = staffCrud.thunks.updateOne;
export const deleteStaff = staffCrud.thunks.deleteOne;
export const { clearError: clearStaffError, setSelected: setSelectedStaff } = staffCrud.actions;

export default staffCrud.reducer;

