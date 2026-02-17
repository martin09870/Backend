const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// GET : récupérer tous les administrateurs avec leur photo
router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT 
        id_admin,
        nom_admin,
        prenom_admin,
        email_admin,
        telephone_admin,
        role
      FROM administrateur
      ORDER BY id_admin DESC
    `;
    /* ,
        token_version,
        reset_attempts,
        reset_block_until */

    const result = await query(sql);

    // Conversion BYTEA -> base64
    const admins = result.rows.map(admin => ({
      id_admin: admin.id_admin,
      nom_admin: admin.nom_admin,
      prenom_admin: admin.prenom_admin,
      email_admin: admin.email_admin,
      telephone_admin: admin.telephone_admin,
      role: admin.role/* ,
      token_version: admin.token_version,
      reset_attempts: admin.reset_attempts,
      reset_block_until: admin.reset_block_until */
    }));

    res.status(200).json({
      success: true,
      total: admins.length,
      data: admins
    });

  } catch (error) {
    console.error("Erreur récupération administrateurs :", error.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des administrateurs"
    });
  }
});

module.exports = router;