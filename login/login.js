const express = require('express');
const router = express.Router();
const { query } = require('../config/db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Limiter les tentatives de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: 'Trop de tentatives, réessayez dans 15 minutes'
});

router.post('/', loginLimiter, async (req, res) => {
  const { email_admin, password } = req.body;

  // Validation simple
  if (!email_admin || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  if (!validator.isEmail(email_admin)) {
    return res.status(400).json({ message: 'Email invalide' });
  }

  try {
    // Vérifier si l'admin existe
    const result = await query('SELECT * FROM administrateur WHERE email_admin = $1', [email_admin]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Comparer le mot de passe
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id_admin: admin.id_admin,
        email_admin: admin.email_admin,
        role: admin.role,
        token_version: admin.token_version
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
       message: 'Connexion réussie', token, role: admin.role
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;