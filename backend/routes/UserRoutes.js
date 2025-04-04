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

module.exports = router;