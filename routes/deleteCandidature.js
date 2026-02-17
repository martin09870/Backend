const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

router.delete('/:id', async (req, res) => {
    try {
        const id_candidature = parseInt(req.params.id);

        if (!id_candidature) {
            return res.status(400).json({ error: "id_candidature est obligatoire" });
        }

        // Vérifier si la candidature existe
        const check = await query(
            "SELECT id_candidature FROM candidature WHERE id_candidature = $1",
            [id_candidature]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ error: "Candidature non trouvée" });
        }

        // Supprimer les expériences
        await query(
            "DELETE FROM experience_professionnelle WHERE id_candidature = $1",
            [id_candidature]
        );

        // Supprimer les formations
        await query(
            "DELETE FROM formation_professionnelle WHERE id_candidature = $1",
            [id_candidature]
        );

        // Supprimer la candidature
        await query(
            "DELETE FROM candidature WHERE id_candidature = $1",
            [id_candidature]
        );

        res.json({
            message: "Candidature et toutes ses données liées ont été supprimées avec succès",
            id_candidature: id_candidature
        });

    } catch (error) {
        console.error("Erreur suppression candidature :", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

module.exports = router;