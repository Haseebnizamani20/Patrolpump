/**
 * Role-based authorization middleware.
 * Must be used AFTER the auth middleware (expects req.user to be set).
 *
 * Usage:
 *   router.post('/some-route', auth, role('owner'), controller);
 *   router.get('/any-role-route', auth, role('owner', 'operator'), controller);
 *
 * @param  {...string} allowedRoles - Roles permitted to access the route
 */
const role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no user context',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden — requires ${allowedRoles.join(' or ')} role`,
      });
    }

    next();
  };
};

module.exports = role;
