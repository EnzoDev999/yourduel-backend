const express = require("express");
const {
  register,
  login,
  getUserProfile,
  getLeaderboard,
  resetAllUserStats,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware"); // Utilisation du middleware protect
const User = require("../models/User");
const Duel = require("../models/Duel");
const router = express.Router();

// Route pour l'inscription
router.post("/register", register);

// Route pour la connexion
router.post("/login", login);

// Route pour récupérer le profil de l'utilisateur connecté
router.get("/profile", protect, getUserProfile);

// Route pour récupérer un utilisateur par son nom d'utilisateur
router.get("/users/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération de l'utilisateur",
      error,
    });
  }
});

// Route pour récuper tous les utilisateurs
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id"); // Récupérer uniquement les username et l'ID de l'utilisateur
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs",
      error,
    });
  }
});

// Route pour obtenir l'historique des duels de l'utilisateur
router.get("/duelHistory/:userId", async (req, res) => {
  try {
    const { page = 1, limit = 3 } = req.query; // Par défaut, afficher les 3 derniers duels

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    // Trier l'historique des duels par date décroissante
    const sortedHistory = user.duelsHistory.sort((a, b) => b.date - a.date);

    // Pagniner l'historique des duels
    const paginatedHistory = sortedHistory.slice(
      (page - 1) * limit,
      page * limit
    );

    // Peupler chaque duel manuellement
    const populatedHistory = await Promise.all(
      paginatedHistory.map(async (entry) => {
        const duel = await Duel.findById(entry.duelId);
        return {
          ...entry._doc, // Conserver les autres champs de l'entrée
          duel, // Ajouter les informations du duel peuplées
        };
      })
    );

    // Compte total pour la pagination
    const totalDuels = user.duelsHistory.length;

    res.status(200).json({
      duels: populatedHistory, // Les duels peuplés
      totalPages: Math.ceil(totalDuels / limit), // Nombre de pages
      currentPage: parseInt(page), // Page actuelle
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'historique des duels :",
      error
    );
    res.status(500).json({
      message: "Erreur lors de la récupération de l'historique des duels",
      error,
    });
  }
});

router.get("/leaderboard", getLeaderboard); // Route pour obtenir le classement des utilisateurs

router.put("/resetStats", resetAllUserStats); // Route pour réinitialiser les stats des utilisateurs

module.exports = router;
