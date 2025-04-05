const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema({
    roundNumber: { type: Number, required: true }, // 1 to 5
    puzzle: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null }, // When the round ended (win/timeout)
    player1: {
        solution: { type: String, default: null },
        timeTakenMs: { type: Number, default: null }, // Time from round start to submission
        correct: { type: Boolean, default: null } // Was the first submission correct?
    },
    player2: {
        solution: { type: String, default: null },
        timeTakenMs: { type: Number, default: null },
        correct: { type: Boolean, default: null }
    },
    roundWinnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Who won this specific round
    endedReason: { type: String, enum: ['solved', 'timeout'], default: null } // How the round concluded
}, { _id: false });


const GameSchema = new mongoose.Schema(
    {
        gameId: { type: String, required: true, unique: true }, // Use UUID generated on server
        player1: { // Basic player info
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true }
        },
        player2: { // Basic player info
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true }
        },
        rounds: [RoundSchema], // Array to store details of each round
        currentRound: { type: Number, default: 0 }, // Track active round (0-4 initially, then 1-5 for rounds array)
        player1Score: { type: Number, default: 0 }, // Rounds won by P1
        player2Score: { type: Number, default: 0 }, // Rounds won by P2
        challengeWinnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Overall winner based on score
        challengeLoserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Overall loser
        startTime: { type: Date, required: true }, // Challenge start time
        endTime: { type: Date, default: null }, // Challenge end time
        overallTimeLimitSeconds: { type: Number, required: true }, // Max time for the whole challenge
        roundTimeLimitSeconds: { type: Number, required: true }, // Max time per round
        status: {
            type: String,
            enum: ['pending_acceptance', 'in_progress', 'completed', 'timeout', 'abandoned', 'rejected'], // Simplified status
            required: true,
            default: 'pending_acceptance'
        },
        // player1TotalTimeMs: { type: Number, default: 0 }, // Sum of player 1's time across all rounds (can calculate)
        // player2TotalTimeMs: { type: Number, default: 0 }, // Sum of player 2's time across all rounds (can calculate)
    },
    { timestamps: true } // Adds createdAt and updatedAt
);

module.exports = mongoose.model("Game", GameSchema);