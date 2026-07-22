export function getPostLoginRoute(
  mustChangePassword: boolean,
  requestedRoute: string,
) {
  return mustChangePassword ? "/change-password" : requestedRoute;
}
