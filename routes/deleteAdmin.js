const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// DELETE : supprimer un administrateur par ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  // 1️⃣ Validation de l'id
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "ID administrateur invalide"
    });
  }

  try {
    // 2️⃣ Vérifier si l'admin existe
    const checkAdmin = await query(
      "SELECT id_admin, role FROM administrateur WHERE id_admin = $1",
      [id]
    );

    if (checkAdmin.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Administrateur introuvable"
      });
    }

    // 3️⃣ Interdire la suppression du SUPER_ADMIN
    if (checkAdmin.rows[0].role === "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Impossible de supprimer un SUPER_ADMIN"
      });
    }

    // 4️⃣ Suppression
    await query(
      "DELETE FROM administrateur WHERE id_admin = $1",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Administrateur supprimé avec succès"
    });

  } catch (error) {
    console.error("Erreur suppression administrateur :", error.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression de l'administrateur"
    });
  }
});

module.exports = router;