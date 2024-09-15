const mongoose = require("mongoose");
const fs = require("fs");
const Question = require("./models/Question"); // Assurez-vous que le chemin est correct
const dotenv = require("dotenv");

// Charger les variables d'environnement depuis la racine du projet
dotenv.config({ path: "../.env" }); // Spécifie le chemin relatif vers le fichier .env

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Lire les questions depuis le fichier JSON
const questionsData = JSON.parse(fs.readFileSync("./questions.json", "utf-8")); // Assurez-vous que le chemin est correct

// Fonction pour importer les questions
const importQuestions = async () => {
  try {
    // Supprimer les anciennes questions (si besoin)
    await Question.deleteMany();

    // Insérer les nouvelles questions
    await Question.insertMany(questionsData.questions);
    process.exit();
  } catch (error) {
    console.error("Erreur lors de l'importation des questions :", error);
    process.exit(1);
  }
};

// Appeler la fonction pour lancer l'importation
importQuestions();
