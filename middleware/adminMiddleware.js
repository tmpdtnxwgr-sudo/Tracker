/**
 * Ensure that the authenticated user is an administrator.
 *
 * This middleware should run after the protect middleware.
 */
export const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Administrator privileges are required."
        });
    }

    next();
};