export const getRoleHome = (
  role
) => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "student") {
    return "/student";
  }

  return "/";
};
