// routes/friendRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    getFriendsList,
    getUserProfile // Assuming you move getUserProfile here or keep it in userRoutes
} = require('../controllers/friendController');

const router = express.Router();

// Note: We need access to 'io' in the controller methods.
// We'll pass it via middleware or directly in server.js setup.
// Middleware approach:
const passIO = (io) => (req, res, next) => {
    req.io = io; // Attach io to request object
    next();
};


// Pass 'io' instance to routes that need socket emissions
module.exports = (io) => {
    router.post('/:userId/request', protect, passIO(io), (req, res) => sendFriendRequest(req, res, io));
    router.post('/:userId/accept', protect, passIO(io), (req, res) => acceptFriendRequest(req, res, io));
    router.delete('/:userId/remove', protect, passIO(io), (req, res) => removeFriend(req, res, io)); // Handles reject/cancel/unfriend
    router.get('/list', protect, getFriendsList);
    router.get('/:userId/profile', protect, getUserProfile); // Public profile info + friendship status relative to requester

    return router;
};

// Old getUserProfile route in authRoutes might conflict or be redundant now.
// Decide if '/api/auth/profile' should just return req.user (logged in user's own basic info)
// and '/api/friends/:userId/profile' returns detailed public profile + friendship status.