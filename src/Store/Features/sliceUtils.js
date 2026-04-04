export const getErrorMessage = (error, fallback = "Request failed") =>
  error?.message || fallback;

export const getId = (item) => item?._id || item?.id;

