const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: Process.env.PSQL,
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Route to save game
app.post("/game", async (req, res) => {
  const { player1Name, player2Name, rounds } = req.body;
  const player1Wins = rounds.filter((r) => r.winner === player1Name).length;
  const player2Wins = rounds.filter((r) => r.winner === player2Name).length;

  const winner =
    player1Wins > player2Wins
      ? player1Name
      : player2Wins > player1Wins
      ? player2Name
      : "Tie";

  // Ensure table is created only once
  await pool.query(
    `CREATE TABLE IF NOT EXISTS games(
      id SERIAL PRIMARY KEY, 
      player1_name VARCHAR(255), 
      player2_name VARCHAR(255), 
      player1_score INTEGER, 
      player2_score INTEGER, 
      rounds TEXT, -- Change rounds column to TEXT type
      winner VARCHAR(255)
    )`
  );

  try {
    await pool.query(
      "INSERT INTO games (player1_name, player2_name, player1_score, player2_score, rounds, winner) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        player1Name,
        player2Name,
        player1Wins,
        player2Wins,
        JSON.stringify(rounds), // Convert rounds to JSON string
        winner,
      ]
    );
    res.status(201).send("Game saved successfully");
  } catch (error) {
    console.error("Error saving game:", error);
    res.status(500).send("Error saving game");
  }
});

// Route to fetch all games
app.get("/games", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM games");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).send("Error fetching games");
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
