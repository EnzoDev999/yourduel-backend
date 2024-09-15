const mongoose = require("mongoose");
const Question = require("./models/Question"); // Chemin vers ton modèle
const questionsData = require("./questions.json");
require("dotenv").config();
const connectDB = require("./config/db");

connectDB();

const importQuestions = async () => {
  try {
    for (const question of questionsData) {
      // Vérifie si la question existe déjà en fonction du texte de la question
      const existingQuestion = await Question.findOne({
        question: question.question,
      });

      if (existingQuestion) {
        console.log(`La question existe déjà: ${question.question}`);
      } else {
        // Si la question n'existe pas, elle est insérée
        await Question.create(question);
        console.log(`Nouvelle question ajoutée: ${question.question}`);
      }
    }

    console.log("Importation des nouvelles questions terminée !");
    process.exit();
  } catch (error) {
    console.error("Erreur lors de l'importation des questions :", error);
    process.exit(1);
  }
};

importQuestions();
