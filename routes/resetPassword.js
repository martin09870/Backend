const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { query } = require("../config/db");

/* Force mot de passe */
const isStrongPassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{8,}$/;
  return regex.test(password);
};

/**
 * POST /api/resetpassword
 */
router.post("/", async (req, res) => {
  try {
    const { otp_code, new_password, confirm_new_password } = req.body;

    if (!otp_code || !new_password || !confirm_new_password) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    if (new_password !== confirm_new_password) {
      return res.status(400).json({ message: "Confirmation incorrecte" });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        message:
          "Mot de passe trop faible (8 caractères, majuscule, minuscule, chiffre, spécial)"
      });
    }

    const result = await query(
      `SELECT id_admin, email_admin
       FROM administrateur
       WHERE otp_code = $1
       AND otp_expire > NOW()`,
      [otp_code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Lien ou code invalide / expiré"
      });
    }

    const admin = result.rows[0];

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);

    // Mise à jour + invalidation JWT
    await query(
      `UPDATE administrateur
       SET password_hash = $1,
           reset_token = NULL,
           reset_token_expire = NULL,
           otp_code = NULL,
           otp_expire = NULL,
           reset_attempts = 0,
           reset_block_until = NULL,
           token_version = token_version + 1
       WHERE id_admin = $2`,
      [passwordHash, admin.id_admin]
    );

    // Email confirmation
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Administration" <${process.env.MAIL_USER}>`,
      to: admin.email_admin,
      subject: "Mot de passe modifié avec succès",
      html: `
        <p>Bonjour,</p>
        <p>Votre mot de passe administrateur a été modifié avec succès.</p>
        <p>Si vous n'êtes pas à l'origine de cette action, contactez immédiatement l'administration.</p>
      `
    });

    res.status(200).json({
      message: "Mot de passe réinitialisé avec succès",
      forceLogout: true
    });

  } catch (err) {
    console.error("resetPassword error:", err.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;