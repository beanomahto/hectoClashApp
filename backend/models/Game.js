// models/Game.js
const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true }, // Use UUID generated on server
    player1: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true }, // Store name at time of game
        solution: { type: String, default: null }
    },
    player2: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true }, // Store name at time of game
        solution: { type: String, default: null }
    },
    puzzle: { type: String, required: true }, // The 6-digit sequence
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null for draw/timeout/abandoned
    loserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    timeLimitSeconds: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending_acceptance', 'in_progress', 'completed_win', 'completed_draw', 'timeout', 'abandoned', 'rejected'],
        required: true,
        default: 'pending_acceptance'
    },
    // Optional: Rating changes can be added later if implementing ELO
    // player1RatingChange: { type: Number },
    // player2RatingChange: { type: Number },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

module.exports = mongoose.model("Game", GameSchema);