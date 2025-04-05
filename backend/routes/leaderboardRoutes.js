const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Game = require('../models/Game'); // Adjust path as needed
const User = require('../models/User');   // Adjust path as needed

const TOTAL_ROUNDS = 5; // Ensure this matches server.js

// GET /api/leaderboard/hectoc-challenge
router.get('/hectoc-challenge', async (req, res) => {
    try {
        // --- Leaderboard based on User Points (Simple) ---
        /*
        const topUsersByPoints = await User.find({})
            .sort({ points: -1 }) // Higher points first
            .limit(20) // Get top 20
            .select('name playerId points wins losses draws'); // Select relevant fields

        return res.json(topUsersByPoints);
        */

        // --- Leaderboard based on Challenge Performance (More Complex) ---

        // 1. Aggregate Game Data
        const challengeStats = await Game.aggregate([
            // Filter for completed games only
            {
                $match: {
                    status: 'completed' // Only consider fully completed challenges
                     // Add other filters? e.g., filter out games older than X days?
                     // createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Example: last 30 days
                }
            },
            // Unwind the rounds to process individually? No, calculate totals directly per game first.
            // Project player data into a more usable format, creating one doc per player per game
             {
                 $project: {
                     gameId: 1,
                     player1Id: '$player1.userId',
                     player2Id: '$player2.userId',
                     player1Score: 1,
                     player2Score: 1,
                     challengeWinnerId: 1,
                     rounds: 1, // Keep rounds for detailed time calculation
                     isDraw: { $eq: ['$player1Score', '$player2Score'] } // Determine if the game was a draw
                 }
             },
             // Create two separate documents per game, one for each player's perspective
             {
                 $facet: {
                     player1Data: [
                         { $match: { player1Id: { $exists: true } } },
                         {
                             $project: {
                                 _id: 0, // Exclude default _id
                                 playerId: '$player1Id',
                                 gameId: 1,
                                 score: '$player1Score',
                                 opponentScore: '$player2Score',
                                 wonChallenge: { $eq: ['$challengeWinnerId', '$player1Id'] },
                                 lostChallenge: { $eq: ['$challengeWinnerId', '$player2Id'] }, // Opponent won
                                 isDraw: '$isDraw',
                                 rounds: '$rounds' // Pass rounds array through
                             }
                         }
                     ],
                     player2Data: [
                         { $match: { player2Id: { $exists: true } } },
                         {
                             $project: {
                                 _id: 0,
                                 playerId: '$player2Id',
                                 gameId: 1,
                                 score: '$player2Score',
                                 opponentScore: '$player1Score',
                                 wonChallenge: { $eq: ['$challengeWinnerId', '$player2Id'] },
                                 lostChallenge: { $eq: ['$challengeWinnerId', '$player1Id'] }, // Opponent won
                                 isDraw: '$isDraw',
                                 rounds: '$rounds'
                             }
                         }
                     ]
                 }
             },
             // Combine the faceted results back into one stream of player-game stats
             {
                 $project: {
                     playerGameStats: { $concatArrays: ['$player1Data', '$player2Data'] }
                 }
             },
             { $unwind: '$playerGameStats' }, // Now we have one doc per player per game
             { $replaceRoot: { newRoot: '$playerGameStats' } },

             // Group by Player to calculate aggregate stats
            {
                $group: {
                    _id: '$playerId', // Group by the player's ID
                    totalChallengesPlayed: { $sum: 1 },
                    totalWins: { $sum: { $cond: ['$wonChallenge', 1, 0] } },
                    totalLosses: { $sum: { $cond: ['$lostChallenge', 1, 0] } },
                    totalDraws: { $sum: { $cond: ['$isDraw', 1, 0] } },
                    totalRoundsWon: { $sum: '$score' }, // Sum of rounds won across all challenges
                     // Accumulate data needed for average speed/accuracy calculation
                     allRoundsData: { $push: '$rounds' } // Push the 'rounds' array from each game
                }
            },
            // Calculate Accuracy and Average Speed (requires another stage after grouping)
            {
                $project: {
                    _id: 1, // Keep playerId
                    totalChallengesPlayed: 1,
                    totalWins: 1,
                    totalLosses: 1,
                    totalDraws: 1,
                    totalRoundsWon: 1,
                    accuracy: { // Overall accuracy across all challenges played
                        $cond: {
                             if: { $gt: ['$totalChallengesPlayed', 0] },
                             then: {
                                 $multiply: [
                                     { $divide: ['$totalRoundsWon', { $multiply: ['$totalChallengesPlayed', TOTAL_ROUNDS] }] },
                                     100
                                 ]
                             },
                             else: 0 // Avoid division by zero
                         }
                    },
                    roundsDataForSpeed: '$allRoundsData' // Pass this for the next stage
                }
            },
             // Stage to calculate average speed per *correctly solved round*
             // This is complex within aggregation, might be easier post-query or needs careful $reduce/$map
             {
                 $addFields: {
                     // Calculate total time spent ONLY on rounds this player won
                     speedCalculation: {
                         $reduce: {
                             input: '$roundsDataForSpeed', // Array of arrays of rounds
                             initialValue: { totalCorrectTimeMs: 0, correctRoundsCount: 0 },
                             in: {
                                 $let: {
                                     vars: {
                                         gameRounds: '$$this', // Current game's rounds array
                                         accumulated: '$$value' // { totalCorrectTimeMs, correctRoundsCount }
                                     },
                                     in: {
                                         $let: {
                                             vars: {
                                                  // Process rounds within *this* specific game
                                                  gameProcessingResult: {
                                                      $reduce: {
                                                          input: '$$gameRounds',
                                                          initialValue: { gameTime: 0, gameRounds: 0 },
                                                          in: {
                                                              $let: {
                                                                   vars: {
                                                                       currentRound: '$$this',
                                                                       gameAccumulated: '$$value'
                                                                   },
                                                                   in: {
                                                                       // Check if THIS player won THIS round
                                                                        // Comparing ObjectId requires mongoose.Types.ObjectId(this._id)
                                                                        // Comparison might be tricky here. Assume player1 won if roundWinnerId matches player1Id etc.
                                                                        // Simpler: Check if player1 won the round AND this player IS player1
                                                                        // This requires knowing if the current _id corresponds to player1 or player2 in the original game doc... complex!

                                                                        // *** Easier approach: Calculate Speed based on *all* submitted rounds? Or just winning rounds? ***
                                                                        // Let's calculate based on *rounds won by this player*

                                                                        // This part is very hard with nested arrays and ObjectId checks in pure aggregation.
                                                                        // We'll placeholder the calculation logic. A post-processing step might be needed.
                                                                        gameTime: { $add: ['$$gameAccumulated.gameTime', /* Add time IF this player won the round */ 0 ] },
                                                                        gameRounds: { $add: ['$$gameAccumulated.gameRounds', /* Add 1 IF this player won the round */ 0 ] }
                                                                   }
                                                               }
                                                          }
                                                      }
                                                  }
                                             },
                                             in: {
                                                 // Combine results from this game with overall accumulation
                                                 totalCorrectTimeMs: { $add: ['$$accumulated.totalCorrectTimeMs', '$$gameProcessingResult.gameTime'] },
                                                 correctRoundsCount: { $add: ['$$accumulated.correctRoundsCount', '$$gameProcessingResult.gameRounds'] }
                                             }
                                         }
                                     }
                                 }
                             }
                         }
                     }
                 }
             },
             {
                 $project: {
                     // Exclude temporary fields
                     roundsDataForSpeed: 0
                 }
             },
            // Add player details (name, playerId string)
            {
                $lookup: {
                    from: 'users', // Name of the users collection
                    localField: '_id', // Player's ObjectId from grouping
                    foreignField: '_id', // Match with _id in users collection
                    as: 'userDetails'
                }
            },
            {
                $unwind: { // Unwind the userDetails array (should only be one match)
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true // Keep players even if user doc deleted (unlikely)
                }
            },
            // Final projection for leaderboard structure
            {
                $project: {
                    _id: 0, // Exclude MongoDB ObjectId
                    userId: '$_id',
                    name: '$userDetails.name',
                    playerId: '$userDetails.playerId', // The custom Player ID string
                    totalChallengesPlayed: 1,
                    wins: '$totalWins',
                    losses: '$totalLosses',
                    draws: '$totalDraws',
                    accuracy: { $round: ['$accuracy', 2] }, // Round accuracy to 2 decimal places
                    // avgSpeedMs: { // Calculate average speed - Placeholder!
                    //     $cond: {
                    //          if: { $gt: ['$speedCalculation.correctRoundsCount', 0] },
                    //          then: { $divide: ['$speedCalculation.totalCorrectTimeMs', '$speedCalculation.correctRoundsCount'] },
                    //          else: null // Or 0, or Infinity? Indicate no rounds won?
                    //      }
                    // },
                    // TEMP: Remove speed calc until aggregation is fixed
                    avgSpeedMs: null, // Placeholder
                    totalRoundsWon: 1,
                }
            },
            // Sort the leaderboard
            {
                $sort: {
                    wins: -1,        // Primary: More wins is better
                    accuracy: -1,    // Secondary: Higher accuracy is better
                    // avgSpeedMs: 1, // Tertiary: Lower average speed is better (Placeholder)
                    totalChallengesPlayed: -1 // Tie-breaker: More games played
                }
            },
            // Limit the results
            {
                $limit: 50 // Show top 50 players
            }
        ]);

        // *** Post-processing for Speed Calculation (if needed) ***
        // If the aggregation for speed was too complex, you could iterate challengeStats here,
        // access the `allRoundsData`, and calculate `avgSpeedMs` manually for each player.
        // This involves querying the Game collection again or carefully passing data through.
        // For now, we'll return the results without accurate speed.

        res.json(challengeStats);

    } catch (error) {
        console.error("Error fetching Hectoc challenge leaderboard:", error);
        res.status(500).json({ message: "Error fetching leaderboard", error: error.message });
    }
});

module.exports = router;