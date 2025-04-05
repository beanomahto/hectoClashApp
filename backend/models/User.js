// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const FriendSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // status from the perspective of the user whose document this is in:
  // 'pending': The *other* user sent a request to *this* user.
  // 'requested': *This* user sent a request to the *other* user.
  // 'accepted': The request was accepted, they are friends.
  status: { type: String, enum: ['pending', 'requested', 'accepted'], required: true }
}, { _id: false }); // Don't create separate _id for subdocuments initially


const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    playerId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // --- New Fields for Stats ---
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 }, // If timeouts/simultaneous incorrect are draws
    rating: { type: Number, default: 1000 }, // Example starting ELO/MMR
    totalGamesPlayed: { type: Number, default: 0 },
     // You might add status later:
    // status: { type: String, enum: ['online', 'offline', 'in-game'], default: 'offline' }
    friends: [FriendSchema],

    // *** ADD THIS FIELD FOR LEADERBOARD ***
    points: {
      type: Number,
      default: 1000, // Start everyone with a base score (like ELO) or 0
      index: true    // Add index for faster sorting on leaderboard queries
  },
    


  },
  { timestamps: true }
);

// Hash password before saving (existing)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method (existing)
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);