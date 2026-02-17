const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Route pour récupérer les étudiants d'un groupe avec uniquement les infos essentielles
router.get('/:id', async (req, res) => {
    try {
        const idGroupe = parseInt(req.params.id);
        if (isNaN(idGroupe)) {
            return res.status(400).json({ error: "id_groupe invalide" });
        }

        const sql = `
            SELECT 
                g.id_groupe,
                g.nom_groupe,
                g.date_debut_stage,
                COALESCE(json_agg(
                    json_build_object(
                        'id_candidature', c.id_candidature,
                        'nom', c.nom,
                        'prenom', c.prenom,
                        'email', c.email,
                        'telephone', c.telephone,
                        'niveau_etude', c.niveau_etude,
                        'nom_universite', c.nom_universite,
                        'filiaire', c.filiaire,
                        'date_candidature', c.date_envoi,
                        'photo', encode(c.photo, 'base64')
                    )
                ) FILTER (WHERE c.id_candidature IS NOT NULL), '[]') AS etudiants
            FROM groupe g
            LEFT JOIN candidature c ON c.id_groupe = g.id_groupe
            WHERE g.id_groupe = $1
            GROUP BY g.id_groupe
        `;

        const result = await query(sql, [idGroupe]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Groupe introuvable" });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Erreur récupération groupe simplifié :", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

module.exports = router;