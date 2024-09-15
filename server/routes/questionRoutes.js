const express = require("express");
const Question = require("../models/Question"); // Modèle Question

const router = express.Router();

// Route pour récupérer une question aléatoire selon catégorie
router.get("/random/:category", async (req, res) => {
  try {
    const category = req.params.category;

    // Utilisation d'aggregate() pour récupérer une question aléatoire
    const questions = await Question.aggregate([
      { $match: { category } },
      { $sample: { size: 1 } },
    ]);

    if (questions.length > 0) {
      res.status(200).json(questions[0]); // Renvoie la question
    } else {
      res
        .status(404)
        .json({ message: "Aucune question trouvée pour cette catégorie" });
    }
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de la récupération de la question",
        error,
      });
  }
});

module.exports = router;
