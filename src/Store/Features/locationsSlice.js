import { createCrudSlice } from "./createCrudSlice";

const locationsCrud = createCrudSlice({ name: "locations", basePath: "/locations" });

export const fetchLocations = locationsCrud.thunks.fetchAll;
export const createLocation = locationsCrud.thunks.createOne;
export const updateLocation = locationsCrud.thunks.updateOne;
export const deleteLocation = locationsCrud.thunks.deleteOne;
export const { clearError: clearLocationsError, setSelected: setSelectedLocation } = locationsCrud.actions;

export default locationsCrud.reducer;

