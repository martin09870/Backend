const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { query } = require("../config/db");

// POST /api/exportallcandidats/pdf
router.post("/", async (req, res) => {
  try {
    const { statut, trie, motcle } = req.body;

    const params = [];
    const whereClauses = [];

    // Filtre statut
    if (statut && ["accepté", "refusé", "en attente"].includes(statut.toLowerCase())) {
      params.push(statut.toLowerCase());
      whereClauses.push(`LOWER(c.statut) = $${params.length}`);
    }

    // Mot clé
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

    // Tri
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

    // Récupérer toutes les candidatures filtrées
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

    // Création PDF
    const doc = new PDFDocument({ size: "A4", margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=candidatures.pdf");
    doc.pipe(res);

    doc.fontSize(14).font("Helvetica-Bold").text("Liste des candidatures", { align: "center" });
    doc.moveDown(1);

    const columns = [
      { label: "Nom", width: 70 },
      { label: "Prénom", width: 70 },
      { label: "Téléphone", width: 60 },
      { label: "Email", width: 80 },
      { label: "Statut", width: 50 },
      { label: "Niveau", width: 50 },
      { label: "Université", width: 80 },
      { label: "Filière", width: 50 }
    ];

    const startX = doc.x;
    let currentY = doc.y;
    const rowPadding = 5;

    const drawCell = (text, x, y, width, height, bold = false) => {
      doc.rect(x, y, width, height).stroke();
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(text || "", x + 3, y + 3, { width: width - 6 });
    };

    const getRowHeight = (rowData) => {
      let maxHeight = 20;
      columns.forEach((col, index) => {
        const h = doc.heightOfString(rowData[index] || "", { width: col.width - 6 });
        maxHeight = Math.max(maxHeight, h + rowPadding * 2);
      });
      return maxHeight;
    };

    // En-têtes
    let x = startX;
    const headerHeight = 25;
    columns.forEach(col => { drawCell(col.label, x, currentY, col.width, headerHeight, true); x += col.width; });
    currentY += headerHeight;

    // Lignes
    result.rows.forEach(c => {
      const rowData = [c.nom, c.prenom, c.telephone, c.email, c.statut, c.niveau_etude, c.nom_universite, c.filiaire];
      const rowHeight = getRowHeight(rowData);
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) { doc.addPage(); currentY = doc.y; }
      let cellX = startX;
      rowData.forEach((text, i) => { drawCell(text, cellX, currentY, columns[i].width, rowHeight); cellX += columns[i].width; });
      currentY += rowHeight;
    });

    doc.end();

  } catch (err) {
    console.error("Erreur export PDF :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;