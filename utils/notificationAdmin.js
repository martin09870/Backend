const cron = require("node-cron");
const nodemailer = require("nodemailer");
const { query } = require("../config/db");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// ⏰ Tous les jours à 08h
cron.schedule("0 8 * * *", async () => {
  try {
    //  compter les candidatures en attente +45 jours
    const pendingResult = await query(`
      SELECT COUNT(*) AS total
      FROM candidature
      WHERE statut = 'En attente'
      AND date_envoi <= CURRENT_DATE - INTERVAL '45 days'
    `);

    const totalPending = parseInt(pendingResult.rows[0].total);

    if (totalPending === 0) {
      console.log("✅ Aucune candidature en attente +45 jours");
      return;
    }

    //  récupérer tous les admins
    const adminsResult = await query(`
      SELECT email_admin
      FROM administrateur
    `);

    const adminEmails = adminsResult.rows.map(a => a.email_admin);

    if (adminEmails.length === 0) {
      console.log("⚠️ Aucun admin trouvé");
      return;
    }

    //  envoyer l’email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: adminEmails.join(","),
      subject: "⚠️ Candidatures en attente non traitées",
      html: `
        <p>Bonjour,</p>
        <p>
          Il y a actuellement <b>${totalPending}</b> candidatures
          avec le statut <b>En attente</b> depuis plus de <b>45 jours</b>.
        </p>
        <p>
          Merci de vous connecter à la plateforme afin de les traiter.
        </p>
      `
    });

    console.log("📧 Email envoyé aux administrateurs");
  } catch (err) {
    console.error("❌ Erreur cron candidatures :", err.message);
  }
},{ timezone: "Indian/Antananarivo" });