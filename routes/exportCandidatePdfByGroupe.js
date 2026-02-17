const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { query } = require("../config/db");

/**
 * POST /api/exportercandidatbygroupe/pdf
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

    const { nom_groupe, date_debut_stage } = groupeResult.rows[0];
    const formattedDate = date_debut_stage
      ? new Date(date_debut_stage).toLocaleDateString("fr-FR")
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
       3. Création du PDF
    =============================== */
    const doc = new PDFDocument({
      size: "A4",
      margin: 30,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=candidats_${nom_groupe}.pdf`
    );

    doc.pipe(res);

    /* ===============================
       4. Titre
    =============================== */
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`Groupe : ${nom_groupe}`, { align: "center" });

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Date du début de stage : ${formattedDate}`, {
        align: "center",
      });

    doc.moveDown(1.5);

    /* ===============================
       5. Définition des colonnes
    =============================== */
    const columns = [
      { label: "Nom", width: 70 },
      { label: "Prénom", width: 70 },
      { label: "Adresse actuelle", width: 80 },
      { label: "Téléphone", width: 60 },
      { label: "Email", width: 80 },
      { label: "Niveau", width: 40 },
      { label: "Filière", width:60},
      { label: "Université", width:85},
    ];

    const startX = doc.x;
    let currentY = doc.y;
    const rowPadding = 5;

    /* ===============================
       6. Fonction dessin cellule
    =============================== */
    const drawCell = (text, x, y, width, height, bold = false) => {
      doc
        .rect(x, y, width, height)
        .stroke();

      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(text || "", x + 3, y + 3, {
          width: width - 6,
          align: "left",
        });
    };

    /* ===============================
       7. Calcul hauteur ligne (wrap)
    =============================== */
    const getRowHeight = (rowData) => {
      let maxHeight = 20;

      columns.forEach((col, index) => {
        const textHeight = doc.heightOfString(rowData[index] || "", {
          width: col.width - 6,
        });
        maxHeight = Math.max(maxHeight, textHeight + rowPadding * 2);
      });

      return maxHeight;
    };

    /* ===============================
       8. En-têtes du tableau
    =============================== */
    let x = startX;
    const headerHeight = 25;

    columns.forEach((col) => {
      drawCell(col.label, x, currentY, col.width, headerHeight, true);
      x += col.width;
    });

    currentY += headerHeight;

    /* ===============================
       9. Données
    =============================== */
    candidaturesResult.rows.forEach((candidat) => {
      const rowData = [
        candidat.nom,
        candidat.prenom,
        candidat.adresse_actuelle,
        candidat.telephone,
        candidat.email,
        candidat.niveau_etude,
        candidat.filiaire,
        candidat.nom_universite,
      ];

      const rowHeight = getRowHeight(rowData);

      // Saut de page si nécessaire
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.y;
      }

      let cellX = startX;

      rowData.forEach((text, index) => {
        drawCell(text, cellX, currentY, columns[index].width, rowHeight);
        cellX += columns[index].width;
      });

      currentY += rowHeight;
    });

    doc.end();

  } catch (error) {
    console.error("Erreur export PDF :", error);
    res.status(500).json({ message: "Erreur lors de l'export PDF" });
  }
});

module.exports = router;