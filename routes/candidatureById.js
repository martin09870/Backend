const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Convertir Buffer → Base64
const bufferToBase64 = (buf) => (buf ? buf.toString('base64') : null);

// Récupérer une candidature par ID
router.get('/:id', async (req, res) => {
  try {
    const idCandidature = parseInt(req.params.id);

    if (isNaN(idCandidature)) {
      return res.status(400).json({ error: "id_candidature invalide" });
    }

    const sql = `
      SELECT
        c.*,
        g.nom_groupe,
        COALESCE(json_agg(DISTINCT e.*) FILTER (WHERE e.id_experience IS NOT NULL), '[]') AS experiences,
        COALESCE(json_agg(DISTINCT f.*) FILTER (WHERE f.id_formation IS NOT NULL), '[]') AS formations
      FROM candidature c
      LEFT JOIN groupe g ON c.id_groupe = g.id_groupe
      LEFT JOIN experience_professionnelle e ON c.id_candidature = e.id_candidature
      LEFT JOIN formation_professionnelle f ON c.id_candidature = f.id_candidature
      WHERE c.id_candidature = $1
      GROUP BY c.id_candidature, g.nom_groupe
    `;

    const result = await query(sql, [idCandidature]);

    // Si aucune candidature trouvée
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidature introuvable" });
    }

    const c = result.rows[0];

    // Transformer fichiers binaires → base64
    const candidature = {
      ...c,
      photo: bufferToBase64(c.photo),
      cv: bufferToBase64(c.cv),
      lettre_motivation: bufferToBase64(c.lettre_motivation),
      lettre_introduction: bufferToBase64(c.lettre_introduction),
      experiences: c.experiences || [],
      formations: c.formations || []
    };

    res.json(candidature);

  } catch (err) {
    console.error("Erreur récupération candidature :", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;