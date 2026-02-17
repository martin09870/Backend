const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const { query } = require("../config/db");

// POST /api/exportallcandidats/excel
router.post("/", async (req, res) => {
  try {
    const { statut, trie, motcle } = req.body;

    const params = [];
    const whereClauses = [];

    // -------- Filtre statut -----------
    if (statut && ["accepté", "refusé", "en attente"].includes(statut.toLowerCase())) {
      params.push(statut.toLowerCase());
      whereClauses.push(`LOWER(c.statut) = $${params.length}`);
    }

    // -------- Recherche mot clé -----------
    if (motcle) {
      const mot = `%${motcle.toLowerCase()}%`;
      params.push(mot);
      whereClauses.push(`(
        LOWER(c.nom) LIKE $${params.length} OR
        LOWER(c.prenom) LIKE $${params.length} OR
        LOWER(c.email) LIKE $${params.length} OR
        LOWER(c.niveau_etude) LIKE $${params.length} OR
        LOWER(c.nom_universite) LIKE $${params.length}
      )`);
    }

    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    // -------- Tri -----------
    let sortColumn;
    switch ((trie || "tous").toLowerCase()) {
      case "niveau": sortColumn = "c.point_niveau"; break;
      case "experience": sortColumn = "c.total_experience"; break;
      case "formation": sortColumn = "c.total_formation"; break;
      case "date": sortColumn = "c.date_envoi"; break;
      case "tous":
      default: sortColumn = "c.total_point"; break;
    }

    const orderClause = `ORDER BY ${sortColumn} DESC NULLS LAST, c.id_candidature DESC`;

    // -------- Récupérer toutes les candidatures filtrées -----------
    const sql = `
      SELECT
        c.nom,
        c.prenom,
        c.telephone,
        c.email,
        c.statut,
        c.niveau_etude,
        c.nom_universite,
        c.filiaire
      FROM candidature c
      ${whereClause}
      ${orderClause}
    `;
    const result = await query(sql, params);

    // -------- Création du fichier Excel -----------
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Candidatures");

    
    /* ----- Ligne 1 : Titre fusionné ----- */
    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value =
      `Liste des candidatures`;

    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getCell("A1").font = {
      bold: true,
      size: 14,
    };


    // En-têtes
    worksheet.addRow([
      "Nom",
      "Prénom",
      "Téléphone",
      "Email",
      "Statut",
      "Niveau",
      "Université",
      "Filière"
    ]);
    worksheet.getRow(2).font = { bold: true };

    // Données
    result.rows.forEach(c => {
      worksheet.addRow([
        c.nom,
        c.prenom,
        c.telephone,
        c.email,
        c.statut,
        c.niveau_etude,
        c.nom_universite,
        c.filiaire
      ]);
    });

    // Largeur colonnes
    worksheet.columns.forEach(col => { col.width = 20 });

    // Envoi du fichier
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=candidatures.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Erreur export Excel :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;