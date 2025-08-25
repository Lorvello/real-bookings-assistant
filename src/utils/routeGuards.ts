// Route guards for security and maintenance mode

export const isMaintenanceRoute = (pathname: string): boolean => {
  const maintenanceRoutes = ['/checkout', '/pay'];
  return maintenanceRoutes.some(route => pathname.startsWith(route));
};

export const isStripeTestModeOnly = (): boolean => {
  // Always enforce test mode for security
  return true;
};

export const requiresAuthentication = (pathname: string): boolean => {
  const authRequiredRoutes = ['/checkout', '/pay', '/dashboard', '/settings'];
  return authRequiredRoutes.some(route => pathname.startsWith(route));
};