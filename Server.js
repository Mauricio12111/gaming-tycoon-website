// api/gemini.js

const { GoogleGenAI } = require('@google/genai');
const mysql = require('mysql2/promise');

// ⚠️ Avertissement : Les informations d'identification sont ici en clair pour les besoins de ce test.
// Dans un projet de production, utilisez toujours des variables d'environnement.

const GEMINI_API_KEY = "AIzaSyBDdDDUxr4Y8ZSFN7fBrkRzuL3SkIswAqw";
const DATABASE_CONFIG = {
    host: "mysql-1a36101-botwii.c.aivencloud.com",
    port: 14721,
    user: "avnadmin",
    password: "AVNS_BvVULOCxM7CcMQd0Aqw",
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true
    }
};

// Initialisation de la connexion à la base de données et de l'IA
const connection = mysql.createPool(DATABASE_CONFIG);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Fonction pour créer la table 'apprentissage'
async function ensureTableExists() {
    const query = `
        CREATE TABLE IF NOT EXISTS apprentissage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            question TEXT NOT NULL,
            reponse TEXT NOT NULL
        )
    `;
    await connection.execute(query);
    console.log("Table 'apprentissage' vérifiée/créée.");
}

// Fonction principale qui gère la requête POST
module.exports = async (req, res) => {
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
        await ensureTableExists();

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: message }] }],
        });

        const responseText = response.text;
        
        const insertQuery = "INSERT INTO apprentissage (question, reponse) VALUES (?, ?)";
        await connection.execute(insertQuery, [message, responseText]);
        
        console.log(`[MySQL DB] Nouvelle entrée ajoutée.`);

        res.status(200).json({ aiResponse: responseText });
    } catch (error) {
        console.error("Erreur critique (Gemini ou MySQL) :", error);
        res.status(500).json({ error: "Erreur lors du traitement. Vérifiez les logs Vercel." });
    }
};
