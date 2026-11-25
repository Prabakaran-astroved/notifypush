const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const JWT_SECRET = process.env.JWT_SECRET || 'astroved_pushhub_jwt_super_secret_key_2026_dev';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await AdminUser.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (req.user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User account is inactive' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Middleware: Superadmin only
const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Access denied: Super Admin privileges required.' });
};

// Middleware: Delete permission check (Superadmin or canDelete permission)
const checkDeletePermission = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.permissions?.canDelete)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Permission denied: Only Super Admin can delete records.' });
};

module.exports = { protect, superAdminOnly, checkDeletePermission, JWT_SECRET };
