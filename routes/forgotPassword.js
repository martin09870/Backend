const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { query } = require("../config/db");

const MAX_ATTEMPTS = 15;
const BLOCK_MINUTES = 1;
const OTP_MINUTES = 10;

/**
 * POST /api/forgotpassword
 */
router.post("/", async (req, res) => {

  try {
    const { email_admin } = req.body;

    if (!email_admin) {
      return res.status(400).json({ message: "Email requis" });
    }

    const result = await query(
      `SELECT id_admin, reset_attempts, reset_block_until
       FROM administrateur
       WHERE email_admin = $1`,
      [email_admin]
    );

    // Message neutre (sécurité)
    if (result.rows.length === 0) {
      return res
        .status(200)
        .json({ message: "Si cet email existe, un message a été envoyé." });
    }

    const admin = result.rows[0];

    // Blocage temporaire
    if (
      admin.reset_block_until &&
      new Date(admin.reset_block_until) > new Date()
    ) {
      return res
        .status(429)
        .json({ message: "Trop de tentatives. Réessayez plus tard." });
    }

    // Tentatives
    const attempts = (admin.reset_attempts || 0) + 1;
    let blockUntil = null;

    if (attempts >= MAX_ATTEMPTS) {
      blockUntil = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000);
    }

    // Génération token + OTP
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpire = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

    await query(
      `UPDATE administrateur
       SET reset_token = $1,
           reset_token_expire = $2,
           reset_attempts = $3,
           reset_block_until = $4,
           otp_code = $5,
           otp_expire = $6
       WHERE id_admin = $7`,
      [
        resetToken,
        resetExpire,
        attempts,
        blockUntil,
        otpCode,
        otpExpire,
        admin.id_admin,
      ]
    );

    const accessLink = `${process.env.FRONTEND_URL}/verifyaccess/${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Administration" <${process.env.MAIL_USER}>`,
      to: email_admin,
      subject: "Code d’accès à l’application",
      html: `
        <p>Bonjour,</p>

        <p>Voici votre <strong>code d’accès</strong> valable <strong>${OTP_MINUTES} minutes</strong> :</p>

        <h2 style="letter-spacing:2px">${otpCode}</h2>

        

        <p>Entrez ce code dans l'application pour continuer</p>
       

        <p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
      `,
    });

    return res
      .status(200)
      .json({ message: "Si cet email existe, un message a été envoyé." });
  } catch (err) {
    console.error("forgotPassword error:", err.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;