const { verifyToken } = require('../utils/jwtUtils');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookies first
        if (req.cookies.token) {
            token = req.cookies.token;
        }
        // Then check authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            const decoded = verifyToken(token);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } else {
            res.status(401).json({ message: 'Not authorized, no token' });
        }
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Not authorized to access this route'
            });
        }
        next();
    };
};

module.exports = { protect, authorize };