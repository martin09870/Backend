const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { query } = require("../config/db");



/* 
async function sendAcceptanceEmail(adminEmail, adminPass, candidatEmail, candidatNom, nomGroupe, dateDebut) {
    try {
        const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

        const mailOptions = {
      from: `"Administration" <${process.env.MAIL_USER}>`,
      to: email_admin,
      subject: "Création de votre compte administrateur",
      html: `
        <p>Bonjour <strong>${prenom_admin} ${nom_admin}</strong>,</p>
        <p>Votre compte administrateur a été créé avec succès.</p>
        <p><strong>Email :</strong> ${email_admin}</p>
        <p><strong>Mot de passe :</strong> ${password}</p>
        <p>Veuillez changer votre mot de passe après la première connexion.</p>
        <br>
        <p>Cordialement,<br>Administration</p>
      `
    };

        await transporter.sendMail(mailOptions);
        console.log("E-mail envoyé avec succès à", candidatEmail);
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'e-mail :", error); 
        throw error;
    }
} */


/**
 * POST /api/createadmin
 */
router.post("/", async (req, res) => {
  try {
    const {
      nom_admin,
      prenom_admin,
      email_admin,
      telephone_admin,
      role_admin,
      password,
      confirm_password
    } = req.body;

    // Vérification champs obligatoires
    if (!nom_admin || !prenom_admin || !email_admin || !role_admin || !password || !confirm_password) {
      return res.status(400).json({
        message: "Tous les champs obligatoires doivent être remplis"
      });
    }

    //  Double confirmation du mot de passe
    if (password !== confirm_password) {
      return res.status(400).json({
        message: "Les mots de passe ne correspondent pas"
      });
    }

    //  Vérifier si l'email existe déjà
    const checkEmail = await query(
      "SELECT id_admin FROM administrateur WHERE email_admin = $1",
      [email_admin]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(409).json({
        message: "Cet email est déjà utilisé"
      });
    }

    // Hachage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    //  Insertion dans la base
    const insertAdmin = await query(
      `INSERT INTO administrateur 
      (nom_admin, prenom_admin, email_admin, telephone_admin, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_admin`,
      [
        nom_admin,
        prenom_admin,
        email_admin,
        telephone_admin || null,
        role_admin,
        password_hash
      ]
    );

    //  Envoi de l'email à l'admin créé
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Administration" <${process.env.MAIL_USER}>`,
      to: email_admin,
      subject: "Création de votre compte administrateur",
      html: `
        <p>Bonjour <strong>${prenom_admin} ${nom_admin}</strong>,</p>
        <p>Votre compte administrateur a été créé avec succès.</p>
        <p><strong>Email :</strong> ${email_admin}</p>
        <p><strong>Mot de passe :</strong> ${password}</p>
        <p>Veuillez changer votre mot de passe après la première connexion.</p>
        <br>
        <p>Cordialement,<br>Administration</p>
      `
    };

    await transporter.sendMail(mailOptions);

    //  Réponse succès
    res.status(201).json({
      message: "Administrateur créé avec succès et email envoyé"
    });

  } catch (error) {
    console.error("Erreur création admin :", error.message);
    res.status(500).json({
      message: "Erreur serveur lors de la création de l'administrateur"
    });
  }
});

module.exports = router;