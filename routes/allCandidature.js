const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// POST /api/allcandidate
router.post("/", async (req, res) => {
  try {
    const { statut, trie, motcle, page } = req.body;
    const currentPage = Math.max(parseInt(page) || 1, 1);
    const limit = 10;
    const offset = (currentPage - 1) * limit;
    const params = [];
    const whereClauses = [];

    // ----------- Filtre statut -----------
    if (statut && ["accepté", "refusé", "En attente"].includes(statut.toLowerCase())) {
      params.push(statut.toLowerCase());
      whereClauses.push(`LOWER(c.statut) = $${params.length}`);
    }

    // ----------- Motcle recherche -----------
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

    // ----------- Tri -----------
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

    // ----------- Requête principale -----------
    const sql = `
      SELECT
        c.id_candidature,
        c.nom,
        c.prenom,
        c.telephone,
        c.email,
        c.statut,
        c.photo,
        c.point_niveau,
        c.total_point,
        c.total_experience,
        c.total_formation,
        c.date_envoi,
        c.niveau_etude,
        c.nom_universite,
        c.filiaire
      FROM candidature c
      ${whereClause}
      ${orderClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const sqlParams = [...params, limit, offset];
    const result = await query(sql, sqlParams);

    // ----------- Total pour pagination -----------
    const countSql = `SELECT COUNT(*) AS total FROM candidature c ${whereClause}`;
    const countResult = await query(countSql, params);
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // ----------- Format de retour -----------
    const data = result.rows.map(r => ({
      id_candidature: r.id_candidature,
      nom: r.nom,
      prenom: r.prenom,
      /* telephone: r.telephone,
      email: r.email, */
      statut: r.statut,
      niveau_etude: r.niveau_etude,
      universite: r.nom_universite,
      filiaire: r.filiaire
      //point_niveau: r.point_niveau,
      //total_point: r.total_point,
      //total_experience: r.total_experience,
      //total_formation: r.total_formation,
      /* date_envoi: r.date_envoi,
      photo: r.photo ? r.photo.toString("base64") : null */
    }));
    
    res.json({
      page: currentPage,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      data
    });

  } catch (err) {
    console.error("Erreur allCandidature:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;