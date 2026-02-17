const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const { query } = require("../config/db");

/**
 * POST /api/exportercandidatbygroupe
 * body : { id_groupe }
 */
router.post("/", async (req, res) => {
  const { id_groupe } = req.body;

  if (!id_groupe) {
    return res.status(400).json({ message: "id_groupe requis" });
  }

  try {
    /* ===============================
       1. Récupérer le groupe
    =============================== */
    const groupeResult = await query(
      "SELECT nom_groupe, date_debut_stage FROM groupe WHERE id_groupe = $1",
      [id_groupe]
    );

    if (groupeResult.rows.length === 0) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }

    const nomGroupe = groupeResult.rows[0].nom_groupe;
    const dateDebutStage = groupeResult.rows[0].date_debut_stage;

    const formattedDate = dateDebutStage
      ? new Date(dateDebutStage).toLocaleDateString("fr-FR")
      : "Non définie";

    /* ===============================
       2. Récupérer les candidatures
    =============================== */
    const candidaturesResult = await query(
      `
      SELECT 
        nom,
        prenom,
        adresse_actuelle,
        telephone,
        email,
        niveau_etude,
        filiaire,
        nom_universite
      FROM candidature
      WHERE id_groupe = $1
      ORDER BY nom ASC
      `,
      [id_groupe]
    );

    /* ===============================
       3. Créer le fichier Excel
    =============================== */
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Candidats");

    /* ----- Ligne 1 : Titre fusionné ----- */
    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value =
      `Groupe : ${nomGroupe}   |   Date du début de stage : ${formattedDate}`;

    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getCell("A1").font = {
      bold: true,
      size: 14,
    };

    /* ----- Ligne 2 : En-têtes ----- */
    worksheet.addRow([
      "Nom",
      "Prénom",
      "Adresse actuelle",
      "Numéro téléphone",
      "Email",
      "Niveau d'étude",
      "Filière",
      "Nom université",
    ]);

    worksheet.getRow(2).font = { bold: true };

    /* ----- Lignes suivantes : données ----- */
    candidaturesResult.rows.forEach((candidat) => {
      worksheet.addRow([
        candidat.nom,
        candidat.prenom,
        candidat.adresse_actuelle,
        candidat.telephone,
        candidat.email,
        candidat.niveau_etude,
        candidat.filiaire,
        candidat.nom_universite,
      ]);
    });

    /* ----- Largeur des colonnes ----- */
    worksheet.columns.forEach((column) => {
      column.width = 25;
    });

    /* ===============================
       4. Envoyer le fichier
    =============================== */
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=candidats_${nomGroupe}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Erreur export Excel :", error);
    res.status(500).json({ message: "Erreur lors de l'export Excel" });
  }
});

module.exports = router;