import { createCrudSlice } from "./createCrudSlice";

const shiftsCrud = createCrudSlice({ name: "shifts", basePath: "/shifts" });

export const fetchShifts = shiftsCrud.thunks.fetchAll;
export const createShift = shiftsCrud.thunks.createOne;
export const updateShift = shiftsCrud.thunks.updateOne;
export const deleteShift = shiftsCrud.thunks.deleteOne;
export const { clearError: clearShiftsError, setSelected: setSelectedShift } = shiftsCrud.actions;

export default shiftsCrud.reducer;

