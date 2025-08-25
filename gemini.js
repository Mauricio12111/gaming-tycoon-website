// api/gemini.js
const { GoogleGenAI } = require('@google/genai');
const mysql = require('mysql2/promise');

// ⚠️ ATTENTION : Informations d'identification en clair pour le test. 
// Pour la production, utilisez des Variables d'Environnement Vercel.

const GEMINI_API_KEY = "AIzaSyBDdDDUxr4Y8ZSFN7fBrkRzuL3SkIswAqw";
const DATABASE_CONFIG = {
    host: "mysql-1a36101-botwii.c.aivencloud.com",
    port: 14721,
    user: "avnadmin",
    password: "AVNS_BvVULOCxM7CcMQd0Aqw",
    database: "defaultdb",
    // Nécessaire pour la connexion sécurisée (ssl-mode=REQUIRED)
    ssl: {
        rejectUnauthorized: true
    }
};

// Initialisation de la connexion à la base de données et de l'IA
const connection = mysql.createPool(DATABASE_CONFIG);
const ai = new new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Fonction pour créer la table si elle n'existe pas
async function ensureTableExists() {
    // La table est renommée 'stockage' pour correspondre au concept.
    const query = `
        CREATE TABLE IF NOT EXISTS stockage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            question TEXT NOT NULL,
            reponse TEXT NOT NULL
        )
    `;
    await connection.execute(query);
    console.log("Table 'stockage' vérifiée/créée.");
}

// Fonction principale qui gère la requête POST
module.exports = async (req, res) => {
    // Vérification de la méthode
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { message } = req.body;

    if (!message) {
        res.status(400).send({ error: "Le message est requis." });
        return;
    }

    try {
        // 1. Assurez-vous que la table de stockage existe
        await ensureTableExists();

        // 2. Appel au modèle Gemini pour obtenir la réponse
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: message }] }],
        });

        const responseText = response.text;
        
        // 3. Insertion de la question et de la réponse dans MySQL (Stockage)
        const insertQuery = "INSERT INTO stockage (question, reponse) VALUES (?, ?)";
        await connection.execute(insertQuery, [message, responseText]);
        
        console.log(`[MySQL DB] Nouvelle entrée stockée.`);

        // 4. Renvoie de la réponse à l'interface (Frontend)
        res.status(200).json({ aiResponse: responseText });
        
    } catch (error) {
        console.error("Erreur critique (Gemini ou MySQL) :", error);
        
        // En cas d'échec de la connexion (MySQL ou Gemini), renvoyer une erreur 500
        res.status(500).json({ error: "Erreur lors du traitement. Connexion à MySQL ou Gemini échouée.", details: error.message });
    }
};
