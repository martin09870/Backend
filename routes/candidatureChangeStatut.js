const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const nodemailer = require("nodemailer");
//require("dotenv").config(); // pour lire les variables d'environnement



function formDate(date) {
    if (!date) return "";

    const d = date instanceof Date
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
        : new Date(date + "T00:00:00");

    return d.toLocaleDateString("fr-FR", {
        timeZone: "Indian/Comoro",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

async function sendAcceptanceEmail(candidatEmail, candidatNom, nomGroupe, date) {
     
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: false,
            
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            tls:{
                rejectUnauthorized:false,
            },
        });


        

      

        const mailOptions = {
            from: `"Admin" <${process.env.MAIL_USER}>`,
            to: candidatEmail.trim(),
            subject: "Félicitations ! Votre candidature a été acceptée",
            html: `
                <p>Bonjour ${candidatNom},</p>
                <p>Nous avons le plaisir de vous informer que votre candidature a été <strong>acceptée</strong> !</p>
                <p>Vous êtes ajouté au groupe <strong>${nomGroupe}</strong> dont le stage commencera à 9 heure le <strong>${date}</strong> à Faravohitra.</p>
                <p>Nous vous souhaitons un excellent stage !</p>
                <br>
                <p>Cordialement,<br> L'équipe RH</p><br>
                <p>Direction Des Impots  Madagascar</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("E-mail envoyé avec succès à", candidatEmail);
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'e-mail :", error); 
        throw error;
    }
}

async function sendRejectEmail(candidatEmail, candidatNom) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: false,
            
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
                ,
            },
            tls:{
                rejectUnauthorized:false,
            },
           /*  service: "gmail", // ou autre service SMTP
            auth: {
                user: adminEmail,
                pass: adminPass,
            }, */
        });
        

        const mailOptions = {
            from: `"Admin" <${process.env.MAIL_USER}>`,
            to: candidatEmail.trim(),
            subject: "Réponse à votre candidature de stage au sein de la DGI",
            html: `
                <p>Bonjour ${candidatNom},</p>
                <p>Nous accusons réception de votre candidature pour un stage au sein de la  direction Générale des Impots (DGI). </p>
                <p>Après étude attentive de votre dossier, nous regrettons de vous informer que votre candidature n’a pas été retenue. Ce refus ne remet nullement en cause vos compétences ou votre parcours, mais résulte du nombre limité de places disponibles et des critères retenus pour cette période.</p><br>
                <p>Nous vous remercions de l’intérêt que vous portez à notre institution et vous encourageons à postuler de nouveau lors de prochaines sessions de recrutement.</p><br>
                <p>Nous vous souhaitons plein succès dans la suite de votre parcours académique et professionnel.</p><br>
                <p>Cordialement,<br> L'équipe RH</p><br>
                <p>Direction Des Impots  Madagascar</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("E-mail envoyé avec succès à", candidatEmail);
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'e-mail :", error);
        throw error;
    }
}


// Route pour changer le statut d'une candidature
router.post("/", async (req, res) => {
    try {
        const { id_candidature, statut } = req.body;
        const id_admin = req.user.id_admin; // récupéré depuis le token

        if (!id_candidature || !statut) {
            return res.status(400).json({
                error: "id_candidature et statut sont obligatoires",
            });
        }
        console.log("admin connecter",req.user)
        console.log("admin id : ",id_admin)
        // CAS : STATUT != ACCEPTER
        if (statut !== "accepté") {
            await query(
                `UPDATE candidature 
                 SET statut = $1, id_admin = $2
                 WHERE id_candidature = $3`,
                [statut, id_admin, id_candidature]
            );
            // Récupérer l’email et le nom du candidat
        const candidatResult = await query(
            `SELECT nom, email FROM candidature WHERE id_candidature = $1`,
            [id_candidature]
        );
        const candidat = candidatResult.rows[0];
        

            // Envoyer l’email depuis l’admin
            console.log("email candidat : ", candidat.email)
            let emailSent = true;
            
                try {
                    await sendRejectEmail(
                    candidat.email,
                    candidat.nom
                    );
                } catch (err) {
                    emailSent = false;
                    console.error("Email rejet non envoyé : ", err.message);
                }
            

            return res.json({

                message: emailSent ? "Candidature refusée et email de refus envoyer."
                : "Candidature refusée mais l'email de refus est non envoyé.  Veuillez le contacter manuellement",
                id_admin,emailSent
            });
        }

        // CAS : STATUT = ACCEPTER
        const lastGroupResult = await query(
            `SELECT id_groupe, nom_groupe, date_debut_stage, limite
             FROM groupe 
             ORDER BY id_groupe DESC 
             LIMIT 1`
        );

        if (lastGroupResult.rows.length === 0) {
            return res.status(400).json({
                error: "Aucun groupe existant. Veuillez créer un nouveau groupe."
            });
        }

        const lastGroup = lastGroupResult.rows[0];
        const date = formDate(lastGroup.date_debut_stage);
        const idGroupe = lastGroup.id_groupe;
        const limite = lastGroup.limite;

        const today = new Date();
        const dateDebutStage = new Date(lastGroup.date_debut_stage);
        const diffTime = dateDebutStage - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 5) {
            return res.status(400).json({
                error: "Le groupe est trop proche de la date de début du stage. Veuillez créer un nouveau groupe ou modifier la date du début du stage du groupe actuel."
            });
        }

        const countResult = await query(
            `SELECT COUNT(*) AS total 
             FROM candidature 
             WHERE id_groupe = $1`,
            [idGroupe]
        );

        const total = parseInt(countResult.rows[0].total, 10);

        if (total >= limite) {
            return res.status(400).json({
                error: `Le groupe le plus récent est complet (${limite} candidats). Veuillez créer un nouveau groupe ou modifier la limite de candidat dans le groupe le plus récent.`
            });
        }

        // Accepter le candidat et l’ajouter dans ce groupe
        await query(
            `UPDATE candidature 
             SET statut = 'accepté', id_groupe = $1, id_admin = $2
             WHERE id_candidature = $3`,
            [idGroupe, id_admin, id_candidature]
        );

        // Récupérer l’email et le nom du candidat
        const candidatResult = await query(
            `SELECT nom, email FROM candidature WHERE id_candidature = $1`,
            [id_candidature]
        );
        const candidat = candidatResult.rows[0];

        // Envoyer l’email depuis l’admin
        let emailSent = true;
        try{

            await sendAcceptanceEmail(
                
                candidat.email,
                candidat.nom,
                lastGroup.nom_groupe,
                date
            );
        } catch (e) {
            emailSent = false;
        }

        return res.json({
            message: emailSent
             ?"Candidat accepté, ajouté au groupe et email de confirmation envoyé au candidat"
             :"Candidat accepté et ajouté au groupe mais échèc de l'envoi de l'email de confirmation. Veuillez le contacter manuellement",
            id_groupe: idGroupe,
            id_admin: id_admin,
            emailSent
        });

    } catch (error) {
        console.error("Erreur changement statut :", error);
        res.status(500).json({
            error: "Erreur interne du serveur"
        });
    }
});

module.exports = router;