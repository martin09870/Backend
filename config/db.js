const { Pool } = require('pg');
require('dotenv').config();

// Création du pool de connexions
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Tu peux ajouter d'autres options si nécessaire, par exemple :
   ssl: { rejectUnauthorized: false } // pour certaines connexions cloud
});

// Vérification de la connexion au démarrage
pool.connect()
  .then(client => {
    console.log('✅ Connexion à PostgreSQL réussie');
    client.release(); // libère la connexion immédiatement
  })
  .catch(err => {
    console.error('❌ Erreur de connexion à la base de données :', err.message);
  });

/**
 * Fonction query pratique pour exécuter des requêtes SQL
 * @param {string} text - La requête SQL
 * @param {Array} params - Les paramètres sécurisés pour éviter les injections SQL
 * @returns {Promise} - Retourne le résultat de la requête
 */
const query = (text, params) => {
  return pool.query(text, params)
    .then(res => res)
    .catch(err => {
      console.error('Erreur SQL :', err.message);
      throw err; // propager l'erreur pour la gérer dans le serveur
    });
};

/**
 * Fonction pour fermer proprement le pool de connexions
 * Utile lors d'un arrêt du serveur
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Pool PostgreSQL fermé correctement');
  } catch (err) {
    console.error('Erreur lors de la fermeture du pool :', err.message);
  }
};

// Export du pool et de la fonction query
module.exports = {
  query,
  pool,
  closePool
};
