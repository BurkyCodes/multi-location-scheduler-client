export const getRoleLabel = (user) =>
  String(
    user?.role_id?.role ||
      user?.role ||
      (Array.isArray(user?.status) && user.status.length ? user.status[0] : "") ||
      "",
  ).toLowerCase();

export const hasRole = (user, roles = []) => {
  const roleLabel = getRoleLabel(user);
  return roles.some((role) => roleLabel.includes(String(role).toLowerCase()));
};

