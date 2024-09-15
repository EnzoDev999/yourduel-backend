const mongoose = require("mongoose");

const duelSchema = new mongoose.Schema({
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  challengerUsername: {
    type: String,
    required: true,
  },
  opponent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  opponentUsername: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: false, // Peut être générée plus tard
  },
  options: {
    type: [String],
    required: false, // Peut être généré plus tard
  },
  correctAnswer: {
    type: String,
    required: false, // Peut être généré plus tard
  },
  challengerAnswer: {
    type: String,
    default: null,
  },
  opponentAnswer: {
    type: String,
    default: null,
  },

  // Ajout des champs pour savoir si chaque joueur a répondu
  challengerAnswered: {
    type: Boolean,
    default: false, // Initialement à false
  },
  opponentAnswered: {
    type: Boolean,
    default: false, // Initialement à false
  },

  challengerPointsGained: {
    type: Number,
    default: 0,
  },
  opponentPointsGained: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "completed"],
    default: "pending",
  },

  // Ajout de la possibilité d'avoir "draw" pour une égalité
  winner: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Duel = mongoose.model("Duel", duelSchema);

module.exports = Duel;
