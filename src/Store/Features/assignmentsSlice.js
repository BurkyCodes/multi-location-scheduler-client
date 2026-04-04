import { createCrudSlice } from "./createCrudSlice";

const assignmentsCrud = createCrudSlice({ name: "assignments", basePath: "/assignments" });

export const fetchAssignments = assignmentsCrud.thunks.fetchAll;
export const createAssignment = assignmentsCrud.thunks.createOne;
export const updateAssignment = assignmentsCrud.thunks.updateOne;
export const deleteAssignment = assignmentsCrud.thunks.deleteOne;
export const {
  clearError: clearAssignmentsError,
  setSelected: setSelectedAssignment,
} = assignmentsCrud.actions;

export default assignmentsCrud.reducer;

