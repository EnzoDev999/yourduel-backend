const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

// Autoriser le frontend à se connecter via CORS
app.use(
  cors({
    origin: "*", // URL du frontend local
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: "*", // URL du frontend local
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("socketio", io); // Attache l'objet io à l'application

// Middleware pour parser les requêtes en JSON
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/duels", require("./routes/duelRoutes")(io));
app.use("/api/questions", require("./routes/questionRoutes")); // Ajoute cette ligne pour la route des questions

// Connexion à Socket.IO
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion : ${socket.id}`);

  // Le joueur rejoint la room de l'utilisateur et du duel
  socket.on("joinRooms", ({ userId, duelId }) => {
    console.log(
      `L'utilisateur ${userId} a rejoint son room et la room du duel ${duelId}`
    );
    socket.join(userId); // Joindre la room de l'utilisateur pour les événements personnels
    socket.join(duelId); // Joindre la room du duel pour les événements de duel
  });

  socket.on("duelReceived", (data) => {
    console.log("Duel reçu :", data);
    io.to(data.opponent).emit("duelReceived", data); // Notifie l'adversaire
  });

  socket.on("duelAccepted", (data) => {
    console.log("Duel accepté :", data);
    io.to(data.challenger).emit("duelAccepted", data); // Notifie le challenger
    io.to(data.opponent).emit("duelAccepted", data); // Notifie l'adversaire
  });

  socket.on("duelCompleted", (duel) => {
    console.log("Événement duelCompleted émis pour le duel:", duel._id);
    io.to(duel._id).emit("duelCompleted", duel); // Notifie la room du duel
  });
});

// Lancement du serveur
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Écoute sur toutes les interfaces réseau locales

server.listen(PORT, HOST, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
