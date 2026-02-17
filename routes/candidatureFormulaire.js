const express = require('express');
const router = express.Router();
const multer = require('multer');
const { query } = require('../config/db');
const { calcPointNiveau, parseMonths, calcPointByMonths} = require('../utils/points');

// Multer en mémoire pour stocker les fichiers dans buffer (pour BYTEA)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route POST pour recevoir le formulaire
router.post('/', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'lettre', maxCount: 1 }
]), async (req, res) => {
  try {
    const formData = req.body;
    const files = req.files;

    // Parser expériences et formations
    const experiences = formData.experiences ? JSON.parse(formData.experiences) : [];
    const formations = formData.formations ? JSON.parse(formData.formations) : [];
    const niveau = formData.niveauEtude;
    let pointNiveau = calcPointNiveau(niveau);

     // somme points experience
    let total_exp_points = 0;
    for (const e of experiences) {
      const months = parseMonths(e.duree);
      total_exp_points += calcPointByMonths(months);
    }
    let total_form_points = 0;
    for (const f of formations) {
      let months = parseMonths(f.duree);
      total_form_points += calcPointByMonths(months);
    }
    let total_points = pointNiveau + total_exp_points + total_form_points;

    // Insérer la candidature principale
    const sqlCandidature = `
      INSERT INTO candidature
      (nom, prenom, age, adresse_actuelle, photo, telephone, email, cv, lettre_motivation, niveau_etude, nom_universite, date_envoi, statut, point_niveau, total_point, total_experience, total_formation, filiaire)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),'En attente',$12,$13,$14,$15,$16)
      RETURNING id_candidature;
    `;

    const valuesCandidature = [
      formData.nom,
      formData.prenom,
      formData.age,
      formData.adresse,
      files.photo ? files.photo[0].buffer : null,
      formData.telephone,
      formData.email,
      files.cv ? files.cv[0].buffer : null,
      files.lettre ? files.lettre[0].buffer : null,
      formData.niveauEtude,
      formData.universite,
      pointNiveau,
      total_points,
      total_exp_points,
      total_form_points,
      formData.filiaire
    ];

    const resultCandidature = await query(sqlCandidature, valuesCandidature);
    const idCandidature = resultCandidature.rows[0].id_candidature;

    

    // Insérer les expériences
    for (const exp of experiences) {
      let dur = exp.duree;
      let pointDur = calcPointByMonths(parseMonths(dur));
      const sqlExp = `
        INSERT INTO experience_professionnelle
        (id_candidature, titre_experience, duree_experience, detail_experience, nom_entreprise, point_experience)
        VALUES ($1,$2,$3,$4,$5,$6);
      `;
      await query(sqlExp, [
        idCandidature,
        exp.titre,
        exp.duree,
        exp.detail,
        exp.entreprise,
        pointDur
      ]);
    }

    

    // Insérer les formations
    for (const form of formations) {
      let dur = form.duree;
      let pointDur = calcPointByMonths(parseMonths(dur));
      const sqlForm = `
        INSERT INTO formation_professionnelle
        (id_candidature, titre_pro, duree_pro, detail_pro, nom_institue_formation, point_formation)
        VALUES ($1,$2,$3,$4,$5,$6);
      `;
      await query(sqlForm, [
        idCandidature,
        form.diplome,
        form.duree,
        form.detail,
        form.etablissement,
        pointDur
      ]);
    }

    res.status(201).json({ message: 'Candidature enregistrée ✅', id_candidature: idCandidature });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur ❌', error: err.message });
  }
});

module.exports = router;