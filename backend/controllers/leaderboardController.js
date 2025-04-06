// / controllers/leaderboardController.js
const User = require('../models/User'); // Adjust path if necessary

/**
 * @desc    Get Global Leaderboard
 * @route   GET /api/leaderboard/global
 * @access  Public (or Private if login required)
 */
const getGlobalLeaderboard = async (req, res) => {
    try {
        // Define how many top players to fetch
        const limit = parseInt(req.query.limit) || 50; // Default to 50, allow override via query param

        // Fetch users, sort by points descending, limit results
        const leaderboard = await User.find({}) // Fetch all users (or apply filters if needed)
            .sort({ points: -1 }) // Sort by 'points' field, -1 for descending
            .limit(limit)
            .select('playerId name points wins losses draws totalGamesPlayed'); // Select fields needed for display

        res.json(leaderboard);

    } catch (error) {
        console.error('Error fetching global leaderboard:', error);
        res.status(500).json({ message: 'Server error while fetching leaderboard.' });
    }
};

// --- Placeholder for potential future leaderboard types ---

/**
 * @desc    Get Country Leaderboard (Example Structure)
 * @route   GET /api/leaderboard/country/:countryName
 * @access  Public (or Private)
 */
const getCountryLeaderboard = async (req, res) => {
     try {
        const limit = parseInt(req.query.limit) || 50;
        const countryName = req.params.countryName; // Get country from route parameter

         if (!countryName) {
             return res.status(400).json({ message: 'Country name is required.' });
         }

        // Example: Assumes you have a 'country' field in your User model
        const leaderboard = await User.find({ country: countryName }) // Filter by country
            .sort({ points: -1 })
            .limit(limit)
            .select('playerId name points wins losses draws totalGamesPlayed country');

         res.json(leaderboard);

     } catch (error) {
        console.error(`Error fetching country leaderboard for ${req.params.countryName}:`, error);
        res.status(500).json({ message: 'Server error while fetching country leaderboard.' });
    }
};

/**
 * @desc    Get College Leaderboard (Example Structure)
 * @route   GET /api/leaderboard/college/:collegeName
 * @access  Public (or Private)
 */
const getCollegeLeaderboard = async (req, res) => {
     try {
        const limit = parseInt(req.query.limit) || 50;
        const collegeName = req.params.collegeName;

         if (!collegeName) {
            return res.status(400).json({ message: 'College name is required.' });
         }

         // Example: Assumes you have a 'college' field in your User model
        const leaderboard = await User.find({ college: collegeName }) // Filter by college
            .sort({ points: -1 })
            .limit(limit)
             .select('playerId name points wins losses draws totalGamesPlayed college');

         res.json(leaderboard);

     } catch (error) {
        console.error(`Error fetching college leaderboard for ${req.params.collegeName}:`, error);
        res.status(500).json({ message: 'Server error while fetching college leaderboard.' });
    }
};


module.exports = {
    getGlobalLeaderboard,
    // Export others when implemented
    // getCountryLeaderboard,
    // getCollegeLeaderboard,
};