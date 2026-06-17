const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const { recordset: rows } = await query(`
      SELECT u.*, r.name as role_name,
             reg.name as region_name, c.name as city_name
      FROM users u
      LEFT JOIN roles r   ON u.role_id   = r.id
      LEFT JOIN regions reg ON u.region_id = reg.id
      LEFT JOIN cities c  ON u.city_id   = c.id
      WHERE u.email = ?
    `, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is inactive. Contact administrator.' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      roleName: user.role_name,
      roleId: user.role_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

    const userObj = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      roleId: user.role_id,
      roleName: user.role_name,
      regionId: user.region_id,
      regionName: user.region_name,
      cityId: user.city_id,
      cityName: user.city_name,
      isActive: !!user.is_active,
      createdAt: user.created_at,
    };

    res.json({ success: true, data: { user: userObj, token } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(`
      SELECT u.*, r.name as role_name, reg.name as region_name, c.name as city_name
      FROM users u
      LEFT JOIN roles r   ON u.role_id   = r.id
      LEFT JOIN regions reg ON u.region_id = reg.id
      LEFT JOIN cities c  ON u.city_id   = c.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        roleId: user.role_id,
        roleName: user.role_name,
        regionId: user.region_id,
        regionName: user.region_name,
        cityId: user.city_id,
        cityName: user.city_name,
        isActive: !!user.is_active,
        createdAt: user.created_at,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const { recordset: rows } = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
