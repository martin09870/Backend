const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// Route pour créer un nouveau groupe
router.post("/", async (req, res) => {
    try {
        const { nom_groupe, date_debut_stage } = req.body;

        // Validation des champs obligatoires
        if (!nom_groupe || !date_debut_stage) {
            return res.status(400).json({
                error: "nom_groupe et date_debut_stage sont obligatoires"
            });
        }

        // Insertion dans la table groupe
        const result = await query(
            `INSERT INTO groupe (nom_groupe, date_debut_stage)
             VALUES ($1, $2)
             RETURNING id_groupe, nom_groupe, date_debut_stage`,
            [nom_groupe, date_debut_stage]
        );

        res.json({
            message: "Groupe créé avec succès",
            groupe: result.rows[0]
        });

    } catch (error) {
        console.error("Erreur création groupe :", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

module.exports = router;