const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Inscription d'un utilisateur
exports.register = async (req, res) => {
  const { username, email, password } = req.body; // Assurez-vous de récupérer l'email depuis le body
  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Nom d'utilisateur déjà pris" });
    }

    // Crée un nouvel utilisateur
    const user = await User.create({
      username,
      email: email || undefined,
      password,
    });

    // Génère le token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Envoie la réponse avec l'ID, le nom d'utilisateur, l'email et le token
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email || null, // Ajoute l'email ou null
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription", error });
  }
};

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });
      res.json({ _id: user._id, username: user.username, token });
    } else {
      res
        .status(401)
        .json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion", error });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // On exclut le mot de passe
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération du profil", error });
  }
};

// Obtenir le classement des utilisateurs
exports.getLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query; // Valeurs par défaut si page et limit ne sont pas spécifiés

    // Récupérer les utilisateurs avec au moins 1 point
    const users = await User.find({ points: { $gte: 1 } })
      .sort({ points: -1 }) // Trier par points décroissants
      .select("username points totalWins totalDraws totalDuelsPlayed") // Sélectionner les champs
      .skip((page - 1) * limit) // Sauter les résultats des pages précédentes
      .limit(parseInt(limit)); // Limiter le nombre de résultats à la limite spécifiée

    const totalUsers = await User.countDocuments({ points: { $gte: 1 } }); // Compter le nombre total d'utilisateurs avec au moins 1 point

    res.status(200).json({
      users, // Renvoie les utilisateurs pour la page actuelle
      totalPages: Math.ceil(totalUsers / limit), // Calculer le nombre total de pages
      currentPage: parseInt(page), // Page actuelle
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du classement :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du classement",
      error,
    });
  }
};

exports.resetAllUserStats = async (req, res) => {
  try {
    await User.updateMany(
      {}, // Applique la mise à jour à tous les utilisateurs
      {
        $set: {
          points: 0,
          totalDuelsPlayed: 0,
          totalWins: 0,
          totalLosses: 0,
          duelsHistory: [],
        },
      }
    );
    res.status(200).json({
      message: "Les statistiques des utilisateurs ont été réinitialisées.",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la réinitialisation des statistiques :",
      error
    );
    res
      .status(500)
      .json({ message: "Erreur lors de la réinitialisation des statistiques" });
  }
};

exports.updateUsername = async (req, res) => {
  const { newUsername } = req.body;
  console.log("Reçu côté serveur :", newUsername); // Ajoutez ce log

  if (!newUsername) {
    return res
      .status(400)
      .json({ message: "Le nouveau nom d'utilisateur est obligatoire" });
  }

  try {
    const userId = req.user._id;

    // Vérifier si le pseudo existe déjà dans la base de données
    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser) {
      return res.status(409).json({ message: "Le pseudo est déjà pris" });
    }

    // Mettre à jour le nom d'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    user.username = newUsername;
    await user.save();

    res
      .status(200)
      .json({ message: "Le nom d'utilisateur a été mis à jour avec succès" });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour du nom d'utilisateur :",
      error
    );
    res.status(500).json({
      message: "Erreur lors de la mise à jour du nom d'utilisateur",
      error,
    });
  }
};
