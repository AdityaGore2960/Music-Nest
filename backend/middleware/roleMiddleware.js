/**
 * Role-Based Access Control (RBAC) Middleware
 * Must be used AFTER the protect middleware.
 * 
 * Usage: roleMiddleware('admin', 'artist')
 * Only users with one of the specified roles can proceed.
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
