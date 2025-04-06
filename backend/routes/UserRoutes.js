const express = require("express");
const User = require("../models/User"); // <-- ADD THIS LINE

const router = express.Router();

// Get online users
router.get("/online-users", async (req, res) => {
    try {
        // This will be populated from the socket.io global variable
        const onlineUsers = req.app.get('onlineUsers') || {};
        const onlineUserIds = Object.keys(onlineUsers);
        
        // If no users are online, return empty array
        if (onlineUserIds.length === 0) {
            return res.json([]);
        }
        
        const users = await User.find({ _id: { $in: onlineUserIds } })
            .select("name playerId");

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/profile', async (req, res) => {
    try {
      // req.user is populated by the 'protect' middleware
      const user = await User.findById(req.user.id)
                             .select('-password'); // Exclude password
  
      if (user) {
        res.json({
          _id: user._id, // Use _id from MongoDB
          name: user.name,
          email: user.email,
          playerId: user.playerId,
          // <<< ADD STATS FIELDS HERE >>>
          wins: user.wins,
          losses: user.losses,
          draws: user.draws,
          totalGamesPlayed: user.totalGamesPlayed,
          points: user.points,
          rating: user.rating, // Include if you use it
          createdAt: user.createdAt // Useful for "Member Since"
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: 'Server error fetching profile' });
    }
  });

module.exports = router;