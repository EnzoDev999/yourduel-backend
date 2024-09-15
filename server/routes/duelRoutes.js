const express = require("express");
const {
  createDuel,
  getDuels,
  acceptDuel,
  getUserDuels,
  deleteDuel,
  submitAnswer,
  deleteAllDuels,
} = require("../controllers/duelController");

module.exports = (io) => {
  const router = express.Router();

  // Route pour créer un duel
  router.post("/", (req, res) => createDuel(req, res, io)); // Passer `io` ici

  router.delete("/deleteAll", deleteAllDuels); // Route pour supprimer tous les duels

  // Route pour accepter un duel
  router.put("/:id/accept", (req, res) => acceptDuel(req, res, io));

  // Route pour récupérer tous les duels
  router.get("/", getDuels);

  // Route pour récupérer les duels d'un utilisateur spécifique
  router.get("/user/:userId", getUserDuels);

  // Route pour refuser (et donc supprimer) un duel
  router.delete("/:id/refuse", (req, res) => deleteDuel(req, res, io));

  // Route pour soumettre une réponse
  router.post("/:id/answer", (req, res) => submitAnswer(req, res, io));

  return router;
};
