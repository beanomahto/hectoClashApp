const express = require('express');
const router = express.Router();
// No authentication needed for this route usually

// GET /api/games/spectatable
router.get('/spectatable', (req, res) => {
    try {
        // Access activeGames from the app settings (set in server.js)
        const activeGames = req.app.get('activeGames') || {};
        const onlineUsers = req.app.get('onlineUsers') || {}; // Needed for names

        const spectatableGames = Object.values(activeGames)
            .filter(game => game.status === 'in_progress') // Only show ongoing games
            .map(game => ({
                gameId: game.gameId,
                // Get current names from onlineUsers as player names in game object might be slightly stale if user reconnects/updates name
                player1Name: onlineUsers[game.player1Id]?.name || game.player1?.name || 'Player 1',
                player2Name: onlineUsers[game.player2Id]?.name || game.player2?.name || 'Player 2',
                currentRound: game.currentRound + 1, // Send 1-based round number
                player1Score: game.player1Score,
                player2Score: game.player2Score,
                spectatorCount: game.spectators?.length || 0 // Include spectator count
            }));

        console.log(`[API] Found ${spectatableGames.length} spectatable games.`);
        res.json(spectatableGames);

    } catch (error) {
        console.error("Error fetching spectatable games:", error);
        res.status(500).json({ message: "Error fetching spectatable games" });
    }
});

module.exports = router;