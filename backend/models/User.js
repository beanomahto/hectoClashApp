const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const FriendSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'requested', 'accepted'], required: true }
}, { _id: false });

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        playerId: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        wins: { type: Number, default: 0 }, // Overall challenge wins
        losses: { type: Number, default: 0 }, // Overall challenge losses
        draws: { type: Number, default: 0 }, // Overall challenge draws
        rating: { type: Number, default: 1000 }, // Example starting ELO/MMR (optional)
        totalGamesPlayed: { type: Number, default: 0 }, // Total challenges played
        friends: [FriendSchema],
        points: { // Used for general leaderboard ranking
            type: Number,
            default: 1000, // Start everyone with a base score
            index: true    // Index for faster sorting
        },
    },
    { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);