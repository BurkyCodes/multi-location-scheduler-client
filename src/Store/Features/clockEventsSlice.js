import { createCrudSlice } from "./createCrudSlice";

const clockEventsCrud = createCrudSlice({ name: "clockEvents", basePath: "/clock-events" });

export const fetchClockEvents = clockEventsCrud.thunks.fetchAll;
export const createClockEvent = clockEventsCrud.thunks.createOne;
export const updateClockEvent = clockEventsCrud.thunks.updateOne;
export const deleteClockEvent = clockEventsCrud.thunks.deleteOne;

export default clockEventsCrud.reducer;

