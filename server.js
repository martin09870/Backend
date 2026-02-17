const express = require('express');


const nodemailer = require("nodemailer");


const cors = require('cors');
const dotenv = require('dotenv');
const { closePool } = require('./config/db');
require("dotenv").config();

// Import de la route
const authenticatetoken = require('./middleware/auth');
const loginroot = require('./login/login');
const Createcandidature = require('./routes/candidatureFormulaire');
const AllCandidature = require('./routes/allCandidature')
const AllGroupe = require('./routes/allGroupe');
const CandidatureById = require('./routes/candidatureById');
const CandidatureChangeStatut = require('./routes/candidatureChangeStatut');
const CreateGroupe = require('./routes/createGroupe');
const DeleteCandidature = require('./routes/deleteCandidature');
const GroupeById = require('./routes/groupeById');
const CreateAdmnin = require('./routes/createAdmin');
const ForgotPassword = require('./routes/forgotPassword');
const ResetPassword = require('./routes/resetPassword');
const ChangePassword = require('./routes/changePassword');
const ChangeDateGroupe = require('./routes/changeDateGroupe');
require('./utils/notificationAdmin');
const ExportCandidatExelByGroupe = require('./routes/exportCandidatExelByGroupe');
const ExportCandidatePdfByGroupe = require('./routes/exportCandidatePdfByGroupe');
const ExportAllCandidatsExcel = require('./routes/exportAllCandidatExcel');
const ExportAllCandidatsPdf = require('./routes/exportAllCandidatPdf');
const AuthorizeRoles = require('./middleware/role');
const VerifyAccess = require('./routes/verifyAcces');
const AllAdmin = require('./routes/allAdmin');
const DeleteAdmin = require('./routes/deleteAdmin');
const ChangeLimiteGroupe = require('./routes/changeLimiteGroupe');


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour autoriser le CORS (connexon avec le front)
app.use(cors());

// Middleware pour JSON
app.use(express.json());


// La gestion est faite directement dans la route avec multer

// Routes
app.use('/api/login', loginroot);
app.use('/api/createcandidature', Createcandidature);
app.use('/api/verifyaccess', VerifyAccess);
app.use('/api/allcandidate',authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), AllCandidature);
app.use('/api/allgroupe',authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), AllGroupe);
app.use('/api/candidaturebyid', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), CandidatureById);
app.use('/api/candidaturechangestatut', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), CandidatureChangeStatut);
app.use('/api/creategroupe', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), CreateGroupe);
app.use('/api/deletecandidature', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), DeleteCandidature);
app.use('/api/groupebyid', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), GroupeById);
app.use('/api/createadmin', authenticatetoken, AuthorizeRoles('SUPER_ADMIN'), CreateAdmnin);
app.use('/api/changepassword', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), ChangePassword);
app.use('/api/changedategroupe', authenticatetoken, AuthorizeRoles('SUPER_ADMIN'), ChangeDateGroupe);
app.use('/api/forgotpassword', ForgotPassword);
app.use('/api/resetpassword', ResetPassword);
app.use('/api/exportercandidatbygroupepdf',authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), ExportCandidatePdfByGroupe);
app.use('/api/exportercandidatbygroupeexel', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), ExportCandidatExelByGroupe);

app.use('/api/exportallcandidatsexcel', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), ExportAllCandidatsExcel);
app.use('/api/exportallcandidatspdf', authenticatetoken, AuthorizeRoles('ADMIN','SUPER_ADMIN'), ExportAllCandidatsPdf);

app.use('/api/alladmin', authenticatetoken, AuthorizeRoles('SUPER_ADMIN'), AllAdmin);
app.use('/api/deleteadmin', authenticatetoken, AuthorizeRoles('SUPER_ADMIN'), DeleteAdmin);
app.use('/api/changelimitegroupe', authenticatetoken, AuthorizeRoles('SUPER_ADMIN'), ChangeLimiteGroupe);



// Route test simple
app.get('/', (req, res) => {
  res.send('Backend fonctionne ✅');
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* transporter.verify()
  .then(() => console.log("Connexion SMTP OK"))
  .catch(err => console.error("Erreur SMTP :", err)); */

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);

 /*  console.log("mail_user :  ", process.env.MAIL_USER );
   console.log("pass_user :  ", process.env.MAIL_PASS); */
   
});

// Fermeture propre du pool PostgreSQL à l’arrêt
process.on('SIGINT', async () => {
  await closePool();
  console.log('Serveur arrêté');
  process.exit(0);
});
