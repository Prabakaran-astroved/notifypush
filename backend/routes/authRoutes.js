const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const { protect, superAdminOnly, JWT_SECRET } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await AdminUser.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/update-profile
 */
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await AdminUser.findById(req.user._id).select('+password');

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set new password' });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }
      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message || 'Update profile failed' });
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (SUPER ADMIN ONLY)
// ==========================================

/**
 * GET /api/auth/users
 * List all users
 */
router.get('/users', protect, superAdminOnly, async (req, res) => {
  try {
    const users = await AdminUser.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list users' });
  }
});

/**
 * POST /api/auth/users
 * Super Admin creates a new user with custom permissions
 */
router.post('/users', protect, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password, role, permissions, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = await AdminUser.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const isSuper = role === 'superadmin';
    const newUser = new AdminUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || 'admin',
      status: status || 'active',
      permissions: isSuper
        ? { canSendNotifications: true, canCreateCampaigns: true, canExportReports: true, canDelete: true }
        : {
            canSendNotifications: permissions?.canSendNotifications !== false,
            canCreateCampaigns: permissions?.canCreateCampaigns !== false,
            canExportReports: permissions?.canExportReports !== false,
            canDelete: !!permissions?.canDelete // False by default for non-superadmin
          }
    });

    await newUser.save();

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
});

/**
 * PUT /api/auth/users/:id
 * Super Admin updates user details and permissions
 */
router.put('/users/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, permissions, status } = req.body;

    const user = await AdminUser.findById(id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (role) user.role = role;
    if (status) user.status = status;

    if (password && password.trim().length >= 6) {
      user.password = password.trim();
    }

    if (user.role === 'superadmin') {
      user.permissions = {
        canSendNotifications: true,
        canCreateCampaigns: true,
        canExportReports: true,
        canDelete: true
      };
    } else if (permissions) {
      user.permissions = {
        canSendNotifications: permissions.canSendNotifications !== false,
        canCreateCampaigns: permissions.canCreateCampaigns !== false,
        canExportReports: permissions.canExportReports !== false,
        canDelete: !!permissions.canDelete
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Super Admin deletes a user
 */
router.delete('/users/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const deleted = await AdminUser.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
});

module.exports = router;
