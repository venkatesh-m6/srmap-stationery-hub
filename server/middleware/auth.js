/**
 * Session-based authentication middleware.
 * Checks if the user has an authenticated session before allowing access.
 */
function checkAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = checkAuth;
