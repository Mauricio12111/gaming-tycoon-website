import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 🔹 Config MySQL Aiven
const pool = mysql.createPool({
  host: "mysql-1a36101-botwii.c.aivencloud.com",
  user: "avnadmin",
  password: "AVNS_BvVULOCxM7CcMQd0Aqw",
  database: "defaultdb",
  port: 14721,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

// ⚡ Création des tables thématiques
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        language VARCHAR(10) DEFAULT 'fr',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS learn_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        status ENUM('pending','learned') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Animals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        genre VARCHAR(50) NOT NULL,
        facts TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Histoire (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Geographie (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Anatomie (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Physique (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS CultureGenerale (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Sciences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Mathematiques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100),
        content TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Toutes les tables intelligence prêtes !");
  } catch (err) {
    console.error("❌ Erreur création tables :", err);
  }
})();

// 🔹 Liste des 17 agents spécialisés
const agents = [
  { name: "AnimalBot", domain: "Animaux", intro: "Je connais tous les animaux.", priority: 10 },
  { name: "Historian", domain: "Histoire", intro: "Je maîtrise l'histoire mondiale.", priority: 9 },
  { name: "GeoMaster", domain: "Geographie", intro: "Je connais les pays, continents et cartes.", priority: 9 },
  { name: "Anatomist", domain: "Anatomie", intro: "Je connais le corps humain.", priority: 10 },
  { name: "Physicist", domain: "Physique", intro: "Je maîtrise la physique et les concepts scientifiques.", priority: 10 },
  { name: "CultureGuru", domain: "Culture générale", intro: "Je peux répondre à toute question culturelle.", priority: 8 },
  { name: "Scientist", domain: "Sciences", intro: "Je connais la biologie, chimie et sciences naturelles.", priority: 9 },
  { name: "MathGenius", domain: "Mathématiques", intro: "Je résous tous les problèmes mathématiques.", priority: 10 },
  { name: "Techie", domain: "Technologie", intro: "Je maîtrise l'informatique et la technologie.", priority: 8 },
  { name: "Philosopher", domain: "Philosophie", intro: "Je peux discuter des concepts profonds.", priority: 7 },
  { name: "Linguist", domain: "Langues", intro: "Je connais les langues et la grammaire.", priority: 8 },
  { name: "Economist", domain: "Économie", intro: "Je maîtrise les concepts économiques.", priority: 8 },
  { name: "Politician", domain: "Politique", intro: "Je connais la politique et les systèmes gouvernementaux.", priority: 7 },
  { name: "Engineer", domain: "Ingénierie", intro: "Je connais les principes d'ingénierie.", priority: 8 },
  { name: "ArtCritic", domain: "Art", intro: "Je peux analyser et expliquer les arts.", priority: 7 },
  { name: "Chef", domain: "Cuisine", intro: "Je connais les recettes et techniques culinaires.", priority: 6 },
  { name: "HealthGuru", domain: "Santé", intro: "Je peux répondre aux questions médicales de base.", priority: 9 }
];

// 🔹 Route GET racine pour tester le serveur
app.get("/", (req, res) => {
  res.send("🚀 Mangrat Server est actif et fonctionne !");
});

// 🔹 Route POST /ask
app.post("/ask", async (req, res) => {
  const { question, category = 'general' } = req.body;
  if (!question) return res.status(400).json({ reply: "❌ Donne-moi une question !" });

  try {
    let tableName = "knowledge";
    switch(category.toLowerCase()) {
      case "animal": tableName = "Animals"; break;
      case "histoire": tableName = "Histoire"; break;
      case "géographie": tableName = "Geographie"; break;
      case "anatomie": tableName = "Anatomie"; break;
      case "physique": tableName = "Physique"; break;
      case "culture": tableName = "CultureGenerale"; break;
      case "science": tableName = "Sciences"; break;
      case "math": tableName = "Mathematiques"; break;
      default: tableName = "knowledge"; break;
    }

    const [rows] = await pool.execute(
      `SELECT content AS answer FROM ${tableName} WHERE title = ? OR key_name = ? LIMIT 1`,
      [question, question]
    );

    if (rows.length > 0) return res.json({ reply: rows[0].answer });

    const fallback = "Je ne connais pas encore cette réponse, enseigne-moi !";
    await pool.execute(
      "INSERT INTO learn_queue (question, correct_answer) VALUES (?, ?)",
      [question, fallback]
    );

    res.json({ reply: fallback });
  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    res.status(500).json({ reply: "⚠️ Erreur serveur." });
  }
});

// 🔹 Route POST /teach
app.post("/teach", async (req, res) => {
  const { question, answer, category = 'general' } = req.body;
  if (!question || !answer) return res.status(400).json({ reply: "❌ Question et réponse requises !" });

  try {
    let tableName = "knowledge";
    switch(category.toLowerCase()) {
      case "animal": tableName = "Animals"; break;
      case "histoire": tableName = "Histoire"; break;
      case "géographie": tableName = "Geographie"; break;
      case "anatomie": tableName = "Anatomie"; break;
      case "physique": tableName = "Physique"; break;
      case "culture": tableName = "CultureGenerale"; break;
      case "science": tableName = "Sciences"; break;
      case "math": tableName = "Mathematiques"; break;
      default: tableName = "knowledge"; break;
    }

    await pool.execute(`
      INSERT INTO ${tableName} (title, content)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE content = ?, updated_at = NOW()
    `, [question, answer, answer]);

    await pool.execute("UPDATE learn_queue SET status='learned' WHERE question = ?", [question]);

    res.json({ reply: "✅ Mangrat a appris cette réponse !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "❌ Erreur serveur." });
  }
});

// 🔹 Lancer serveur
app.listen(PORT, () => {
  console.log(`🚀 Mangrat Server running on http://localhost:${PORT}`);
});

// 🔹 Ping MySQL pour garder actif
setInterval(async () => {
  try {
    await pool.execute("SELECT 1");
    console.log("Ping MySQL - serveur actif");
  } catch (err) {
    console.error("Ping MySQL échoué :", err);
  }
}, 60000);
