const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const nodemailer = require("nodemailer");


router.post("/", async (req, res) => {
  const { id_groupe, date_debut_stage } = req.body;
  const idgroupe = Number(id_groupe);

  // =========================
  // 1. Validation des données
  // =========================
  if (!idgroupe || !date_debut_stage) {
    return res.status(400).json({
      message: "id_groupe et date_debut_stage sont obligatoires"
    });
  }

  try {
    // =========================
    // 2. Vérifier que le groupe existe
    // =========================
    const groupeResult = await query(
      "SELECT * FROM groupe WHERE id_groupe = $1",
      [idgroupe]
    );

    if (groupeResult.rowCount === 0) {
      return res.status(404).json({
        message: "Groupe introuvable"
      });
    }

    // =========================
    // 3. Mise à jour de la date
    // =========================
    await query(
      "UPDATE groupe SET date_debut_stage = $1 WHERE id_groupe = $2",
      [date_debut_stage, idgroupe]
    );

    // =========================
    // 4. Récupération des emails
    // =========================

    // Candidatures du groupe
    const candidatsResult = await query(
      `SELECT email, nom, prenom 
       FROM candidature 
       WHERE id_groupe = $1 
       AND email IS NOT NULL`,
      [idgroupe]
    );

    // Admins
    const adminsResult = await query(
      `SELECT email_admin, nom_admin, prenom_admin 
       FROM administrateur`
    );

    // =========================
    // 5. Configuration Email
    // =========================
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    const nomGroupe = groupeResult.rows[0].nom_groupe;

    // =========================
    // 8. Réponse finale
    // =========================
    res.status(200).json({
      message: "Date du groupe modifiée"
    });

    
    (async () => { 
      try {
        // =========================
        // 6. Envoi aux candidats
        // =========================

     
        for (const candidat of candidatsResult.rows) {
          await transporter.sendMail({
            from: `"Gestion Stage DGI" <${process.env.MAIL_USER}>`,
            to: candidat.email,
            subject: "Changement de la date de début de votre stage",
            html: `
              <p>Bonjour <strong>${candidat.prenom} ${candidat.nom}</strong>,</p>
              <p>Nous vous informons que la date de début de votre stage au sein de la DGI Madagascar a été modifiée.</p>
              <p><strong>Nouvelle date :</strong> ${date_debut_stage}</p>
              <p>Cordialement,<br/>Administration DGI</p>
            `
          });
        }

        // =========================
        // 7. Envoi aux admins
        // =========================
        for (const admin of adminsResult.rows) {
          await transporter.sendMail({
            from: `"Gestion Stage DGI" <${process.env.MAIL_USER}>`,
            to: admin.email_admin,
            subject: "Modification date début stage",
            html: `
              <p>Bonjour <strong>${admin.prenom_admin} ${admin.nom_admin}</strong>,</p>
              <p>La date de début du groupe <strong>${nomGroupe}</strong> a été modifiée.</p>
              <p><strong>Nouvelle date :</strong> ${date_debut_stage}</p>
              <p>Cordialement,<br/>Administration DGI</p>
            `
          });
        }
      } catch (mailError) {
        console.error("Erreur de l'envoi de l'email :" ,mailError.message);
      }
    }
    )();

    

    

  } catch (error) {
    console.error("Erreur changeDateGroupe :", error);

    res.status(500).json({
      message: "Erreur serveur lors du changement de date du groupe"
    });
  }
});

module.exports = router;