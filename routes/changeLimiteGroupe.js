const express = require("express");
const router = express.Router();
const { query } = require("../config/db");


router.put("/", async (req, res) => {
  try {
    const { id_groupe, limite } = req.body;

    // ================================
    // Validation des données
    // ================================
    if (!id_groupe || limite === undefined) {
      return res.status(400).json({
        message: "id_groupe et limite sont obligatoires",
      });
    }

    if (!Number.isInteger(id_groupe) || id_groupe <= 0) {
      return res.status(400).json({
        message: "id_groupe doit être un entier positif",
      });
    }

    if (!Number.isInteger(limite) || limite <= 0) {
      return res.status(400).json({
        message: "La limite doit être un entier positif",
      });
    }

    // ================================
    // Vérifier si le groupe existe
    // ================================
    const groupeResult = await query(
      "SELECT id_groupe FROM groupe WHERE id_groupe = $1",
      [id_groupe]
    );

    if (groupeResult.rowCount === 0) {
      return res.status(404).json({
        message: "Groupe introuvable",
      });
    }

    // ================================
    // Compter les candidatures du groupe
    // ================================
    const countResult = await query(
      "SELECT COUNT(*) FROM candidature WHERE id_groupe = $1",
      [id_groupe]
    );

    const nombreCandidats = parseInt(countResult.rows[0].count, 10);

    // ================================
    // Vérification règle métier
    // ================================
    if (limite < nombreCandidats) {
      return res.status(409).json({
        message: `Impossible de définir une limite inférieure au nombre de candidatures existantes dans ce groupe : (${nombreCandidats})`,
      });
    }

    // ================================
    //Mise à jour de la limite
    // ================================
    await query(
      "UPDATE groupe SET limite = $1 WHERE id_groupe = $2",
      [limite, id_groupe]
    );

    // ================================
    //  Succès
    // ================================
    res.status(200).json({
      message: "Limite du groupe modifiée avec succès",
      id_groupe,
      nouvelle_limite: limite,
      candidatures_existantes: nombreCandidats,
    });

  } catch (error) {
    console.error("Erreur changeLimiteGroupe :", error.message);

    res.status(500).json({
      message: "Erreur serveur lors de la modification de la limite",
    });
  }
});

module.exports = router;