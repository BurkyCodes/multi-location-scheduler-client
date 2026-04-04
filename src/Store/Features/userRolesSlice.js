import { createCrudSlice } from "./createCrudSlice";

const userRolesCrud = createCrudSlice({ name: "userRoles", basePath: "/user-roles" });

export const fetchUserRoles = userRolesCrud.thunks.fetchAll;
export const createUserRole = userRolesCrud.thunks.createOne;
export const updateUserRole = userRolesCrud.thunks.updateOne;
export const deleteUserRole = userRolesCrud.thunks.deleteOne;

export default userRolesCrud.reducer;

