const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

/**
 * POST /api/verify-access
 */
router.post("/", async (req, res) => {
  try {
    const { otp_code } = req.body;

    if (!otp_code) {
      return res.status(400).json({
        message: "Code de vérification requis",
      });
    }

    const result = await query(
      `SELECT id_admin, role
       FROM administrateur
       WHERE otp_code = $1
         AND otp_expire > NOW()`,
      [otp_code]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Code invalide ou expiré",
      });
    }

    const admin = result.rows[0];

    const token = jwt.sign(
      {
        id_admin: admin.id_admin,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("verifyAccess error:", err.message);
    return res.status(500).json({
      message: "Erreur serveur",
    });
  }
});

module.exports = router;