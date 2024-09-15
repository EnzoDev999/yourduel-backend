const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Points et scores
  points: {
    type: Number,
    default: 0, // Chaque utilisateur commence avec 0 points
  },
  totalDuelsPlayed: {
    type: Number,
    default: 0,
  },
  totalWins: {
    type: Number,
    default: 0,
  },
  totalLosses: {
    type: Number,
    default: 0,
  },
  totalDraws: {
    // Nouveau champ pour stocker les égalités
    type: Number,
    default: 0,
  },
  duelsHistory: [
    {
      duelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Duel",
      },
      result: {
        type: String,
        enum: ["win", "loss", "draw"],
      },
      pointsGained: {
        type: Number,
        default: 0,
      },
      pointsLost: {
        type: Number,
        default: 0,
      },
      userAnswer: {
        type: String,
        default: null,
      },
      correctAnswer: {
        type: String,
        default: null,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      opponentUsername: {
        type: String,
        default: null,
      },
      question: {
        type: String,
        default: null,
      },
    },
  ],
  profilePicture: {
    type: String,
  },
  lastLogin: {
    type: Date,
  },
  role: {
    type: String,
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware pour hasher le mot de passe avant de sauvegarder
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour vérifier le mot de passe lors de la connexion
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
