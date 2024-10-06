const Duel = require("../models/Duel");
const User = require("../models/User");
const axios = require("axios");

// Créer un nouveau duel avec génération de la question
exports.createDuel = async (req, res, io) => {
  const { challenger, opponent, category } = req.body;

  // Vérification : empêcher d'envoyer un duel à soi-même
  if (challenger.toString() === opponent.toString()) {
    return res.status(400).json({
      message: "Vous ne pouvez pas vous envoyer un duel à vous-même !",
    });
  }

  try {
    const challengerUser = await User.findById(challenger);
    const opponentUser = await User.findById(opponent);

    if (!challengerUser || !opponentUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Utiliser simplement process.env.API_URL pour récupérer l'URL du backend
    const API_URL = process.env.API_URL || "http://localhost:5000";

    // Appel à l'API pour obtenir une question aléatoire dès la création du duel
    const response = await axios.get(
      `${API_URL}/api/questions/random/${category}`
    );
    const questionData = response.data;

    const duel = new Duel({
      challenger: challengerUser._id,
      challengerUsername: challengerUser.username,
      opponent: opponentUser._id,
      opponentUsername: opponentUser.username,
      category,
      question: questionData.question, // Ajouter la question générée
      options: questionData.options, // Ajouter les options
      correctAnswer: questionData.correctAnswer, // Ajouter la réponse correcte
      status: "pending", // Le duel est en attente d'acceptation
    });

    await duel.save();

    // Notification via WebSocket au joueur qui reçoit le duel
    io.to(opponentUser._id.toString()).emit("duelReceived", duel);

    res.status(201).json(duel);
  } catch (error) {
    console.error("Erreur lors de la création du duel:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la création du duel", error });
  }
};

exports.acceptDuel = async (req, res, io) => {
  try {
    const duel = await Duel.findById(req.params.id);
    if (!duel) {
      return res.status(404).json({ message: "Duel non trouvé" });
    }

    duel.status = "accepted"; // Marquer le duel comme accepté
    await duel.save();

    // Notifier les deux joueurs via WebSocket
    io.to(duel.challenger.toString()).emit("duelAccepted", duel);
    io.to(duel.opponent.toString()).emit("duelAccepted", duel);

    res.status(200).json(duel);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de l'acceptation du duel", error });
  }
};

// Récupérer tous les duels
exports.getDuels = async (req, res) => {
  try {
    const duels = await Duel.find();
    res.status(200).json(duels);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des duels", error });
  }
};

// Contrôleur pour récupérer un duel spécifique par ID
exports.getDuelById = async (req, res) => {
  try {
    const duel = await Duel.findById(req.params.id);
    if (!duel) {
      return res.status(404).json({ message: "Duel non trouvé" });
    }
    res.status(200).json(duel);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur", error });
  }
};

exports.getUserDuels = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Récupérer à la fois les duels envoyés et reçus par l'utilisateur avec les statuts "pending" ou "accepted"
    const receivedDuels = await Duel.find({
      opponent: userId,
      status: { $in: ["pending", "accepted"] }, // Inclure les duels "accepted"
    });
    const sentDuels = await Duel.find({
      challenger: userId,
      status: { $in: ["pending", "accepted"] }, // Inclure les duels "accepted"
    });

    // Combiner les duels envoyés et reçus
    const allDuels = [...receivedDuels, ...sentDuels];

    res.status(200).json(allDuels);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des duels", error });
  }
};

// Mettre à jour les réponses des joueurs et terminer le duel si les deux ont répondu
exports.submitAnswer = async (req, res, io) => {
  try {
    const { userId, answer } = req.body; // On récupère seulement l'userId et la réponse dans le body
    const { id: duelId } = req.params; // Le duelId est récupéré à partir de l'URL

    if (!duelId || !userId || !answer) {
      return res.status(400).json({
        message: "Le duelId, userId et la réponse sont obligatoires",
      });
    }

    const duel = await Duel.findById(duelId);

    if (!duel) {
      return res.status(404).json({ message: "Duel non trouvé" });
    }

    // Vérifie si l'utilisateur est le challenger ou l'adversaire en comparant les IDs en tant que chaînes
    if (duel.challenger.toString() === userId.toString()) {
      if (duel.challengerAnswered) {
        return res
          .status(400)
          .json({ message: "Le challenger a déjà répondu" });
      }
      duel.challengerAnswer = answer;
      duel.challengerAnswered = true;

      // Attribution de points pour une bonne réponse (1 point par bonne réponse)
      duel.challengerPointsGained =
        answer.trim().toLowerCase() === duel.correctAnswer.trim().toLowerCase()
          ? 1
          : 0; // Pas de points pour une mauvaise réponse
    } else if (duel.opponent.toString() === userId.toString()) {
      if (duel.opponentAnswered) {
        return res.status(400).json({ message: "L'adversaire a déjà répondu" });
      }
      duel.opponentAnswer = answer;
      duel.opponentAnswered = true;

      // Attribution de points pour une bonne réponse (1 point par bonne réponse)
      duel.opponentPointsGained =
        answer.trim().toLowerCase() === duel.correctAnswer.trim().toLowerCase()
          ? 1
          : 0; // Pas de points pour une mauvaise réponse
    } else {
      return res
        .status(403)
        .json({ message: "Utilisateur non valide pour ce duel" });
    }

    // Vérifie si les deux joueurs ont répondu
    if (duel.challengerAnswered && duel.opponentAnswered) {
      duel.status = "completed"; // Change l'état du duel à "completed"

      let challengerUser = await User.findById(duel.challenger);
      let opponentUser = await User.findById(duel.opponent);

      // Détermine le gagnant ou égalité pour les deux joueurs
      let challengerResult = "draw";
      let opponentResult = "draw";

      // Si le challenger a plus de points que l'adversaire
      if (duel.challengerPointsGained > duel.opponentPointsGained) {
        duel.winner = duel.challengerUsername;

        // Mise à jour des statistiques du challenger (victoire)
        challengerUser.totalWins += 1;
        challengerUser.points += 2; // 2 points pour la victoire
        opponentUser.totalLosses += 1;

        challengerResult = "win";
        opponentResult = "loss";

        // Mettre à jour les points gagnés dans l'historique
        duel.challengerPointsGained = 2; // 2 points gagnés pour la victoire
        duel.opponentPointsGained = 0; // 0 points pour la défaite
      }
      // Si l'adversaire a plus de points que le challenger
      else if (duel.opponentPointsGained > duel.challengerPointsGained) {
        duel.winner = duel.opponentUsername;

        // Mise à jour des statistiques de l'adversaire (victoire)
        opponentUser.totalWins += 1;
        opponentUser.points += 2; // 2 points pour la victoire
        challengerUser.totalLosses += 1;

        challengerResult = "loss";
        opponentResult = "win";

        // Mettre à jour les points gagnés dans l'historique
        duel.opponentPointsGained = 2; // 2 points gagnés pour la victoire
        duel.challengerPointsGained = 0; // 0 points pour la défaite
      }
      // Si c'est une égalité
      else {
        duel.winner = "draw"; // Égalité

        // Compte uniquement l'égalité si les deux joueurs ont marqué au moins un point
        if (duel.challengerPointsGained > 0 && duel.opponentPointsGained > 0) {
          challengerUser.totalDraws += 1;
          opponentUser.totalDraws += 1;

          // Les deux joueurs reçoivent 1 point s'ils ont marqué au moins un point chacun
          challengerUser.points += 1; // 1 point pour une égalité
          opponentUser.points += 1; // 1 point pour une égalité

          // Mettre à jour les points gagnés dans l'historique
          duel.challengerPointsGained = 1; // 1 point pour l'égalité
          duel.opponentPointsGained = 1; // 1 point pour l'égalité
        }
      }

      // Ajouter le duel à l'historique des deux utilisateurs
      challengerUser.duelsHistory.push({
        duelId: duel._id,
        result: challengerResult,
        pointsGained: duel.challengerPointsGained, // Points mis à jour selon le résultat
        pointsLost: challengerResult === "loss" ? 1 : 0, // Point perdu si le duel est perdu
        userAnswer: duel.challengerAnswer, // Ajout de la réponse de l'utilisateur
        correctAnswer: duel.correctAnswer, // Ajout de la bonne réponse
        opponentUsername: duel.opponentUsername,
        question: duel.question,
      });

      opponentUser.duelsHistory.push({
        duelId: duel._id,
        result: opponentResult,
        pointsGained: duel.opponentPointsGained, // Points mis à jour selon le résultat
        pointsLost: opponentResult === "loss" ? 1 : 0, // Point perdu si le duel est perdu
        userAnswer: duel.opponentAnswer, // Ajout de la réponse de l'utilisateur
        correctAnswer: duel.correctAnswer, // Ajout de la bonne réponse
        opponentUsername: duel.challengerUsername,
        question: duel.question,
      });

      // Sauvegarder les utilisateurs mis à jour
      await challengerUser.save();
      await opponentUser.save();

      // Emission d'un événement pour notifier que le leaderboard à été mis à jour
      io.emit("leaderboardUpdated");

      // Notifie les joueurs via WebSocket
      io.to(duel.challenger.toString()).emit("duelCompleted", duel);
      io.to(duel.opponent.toString()).emit("duelCompleted", duel);
    }

    await duel.save(); // Sauvegarde le duel mis à jour
    res.status(200).json(duel);
  } catch (error) {
    console.error("Erreur lors de la soumission de la réponse :", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la soumission de la réponse", error });
  }
};

exports.deleteAllDuels = async (req, res) => {
  try {
    await Duel.deleteMany({}); // Supprime tous les duels
    res.status(200).json({ message: "Tous les duels ont été supprimés." });
  } catch (error) {
    console.error("Erreur lors de la suppression des duels :", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la suppression des duels" });
  }
};

// Supprime un duel en particulier
exports.deleteDuel = async (req, res, io) => {
  try {
    const duelId = req.params.id;

    // Trouver le duel à annuler
    const duel = await Duel.findById(duelId);

    if (!duel) {
      return res.status(404).json({ message: "Duel non trouvé" });
    }

    // Supprimer le duel
    await duel.deleteOne();

    // Notifie les joueurs via WebSocket que le duel a été annulé
    io.to(duel.challenger.toString()).emit("duelCancelled", duel._id);
    io.to(duel.opponent.toString()).emit("duelCancelled", duel._id);

    res.status(200).json({ message: "Duel supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du duel :", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la suppression du duel", error });
  }
};
