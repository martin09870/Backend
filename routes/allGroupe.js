const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT 
                g.id_groupe,
                g.nom_groupe,
                g.date_debut_stage,
                COUNT(c.id_candidature) AS nb_candidatures
            FROM groupe g
            LEFT JOIN candidature c ON g.id_groupe = c.id_groupe
            GROUP BY g.id_groupe
            ORDER BY g.id_groupe DESC
        `;

        const result = await query(sql);

        res.json(result.rows);

    } catch (error) {
        console.error("Erreur récupération des groupes :", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

module.exports = router;