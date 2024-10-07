const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.PSQL,
});

const app = express();
app.use(bodyParser.json());
app.use(
  cors({
    origin: ["https://main.d2lvc08to0alcp.amplifyapp.com/"],
    credentials: true,
  })
);

const createTables = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS players(
      id SERIAL PRIMARY KEY, 
      player1_name VARCHAR(255), 
      player2_name VARCHAR(255), 
      winner VARCHAR(255)
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS rounds(
      id SERIAL PRIMARY KEY, 
      game_id INTEGER REFERENCES players(id) ON DELETE CASCADE, 
      round_number INTEGER, 
      player1_choice VARCHAR(50), 
      player2_choice VARCHAR(50), 
      round_winner VARCHAR(255)
    )`
  );
};
createTables();

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

  try {
    // Insert the players and the final winner into the `players` table
    const playerResult = await pool.query(
      "INSERT INTO players (player1_name, player2_name, winner) VALUES ($1, $2, $3) RETURNING id",
      [player1Name, player2Name, winner]
    );
    const gameId = playerResult.rows[0].id;

    // Insert each round result into the `rounds` table
    for (let i = 0; i < rounds.length; i++) {
      await pool.query(
        "INSERT INTO rounds (game_id, round_number, player1_choice, player2_choice, round_winner) VALUES ($1, $2, $3, $4, $5)",
        [
          gameId,
          rounds[i].round,
          rounds[i].player1Choice,
          rounds[i].player2Choice,
          rounds[i].winner,
        ]
      );
    }

    res.status(201).send("Game and rounds saved successfully");
  } catch (error) {
    console.error("Error saving game and rounds:", error);
    res.status(500).send("Error saving game and rounds");
  }
});

// Route to fetch all games with the final winner
app.get("/games", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM players");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).send("Error fetching games");
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
