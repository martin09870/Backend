const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { query } = require("../config/db");

const isStrongPassword = (password) => {
  const strongRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{8,}$/;
  return strongRegex.test(password);
};


/**
 * POST /api/changepassword
 * Admin connecté (JWT requis)
 */
router.post("/", async (req, res) => {
  try {
    // ID admin depuis le token
    const id_admin = req.user.id_admin;

    const {
      old_password,
      new_password,
      confirm_new_password
    } = req.body;

    //  Vérification des champs
    if (!old_password || !new_password || !confirm_new_password) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires"
      });
    }

    // Confirmation nouveau mot de passe
    if (new_password !== confirm_new_password) {
      return res.status(400).json({
        message: "La confirmation du nouveau mot de passe est incorrecte"
      });
    }

    // Vérification force du mot de passe
if (!isStrongPassword(new_password)) {
  return res.status(400).json({
    message:
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
  });
}

    //  Récupérer l'admin
    const adminResult = await query(
      "SELECT email_admin, password_hash FROM administrateur WHERE id_admin = $1",
      [id_admin]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({
        message: "Administrateur introuvable"
      });
    }

    const admin = adminResult.rows[0];

    //  Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(
      old_password,
      admin.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Ancien mot de passe incorrect"
      });
    }

    //  Hachage du nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    //  Mise à jour en base
    await query(
      "UPDATE administrateur SET password_hash = $1 WHERE id_admin = $2",
      [newPasswordHash, id_admin]
    );

    // Envoi email de confirmation
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
      subject: "Modification de votre mot de passe",
      html: `
        <p>Bonjour,</p>
        <p>Votre mot de passe administrateur a été modifié avec succès.</p>
        <p>Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement l'administration.</p>
        <br>
        <p>Cordialement,<br>Administration</p>
      `
    });

    //  Réponse succès
    res.status(200).json({
      message: "Mot de passe modifié avec succès"
    });

  } catch (error) {
    console.error("Erreur changement mot de passe :", error.message);
    res.status(500).json({
      message: "Erreur serveur lors du changement de mot de passe"
    });
  }
});

module.exports = router;