const mongoose = require("mongoose");

const leaderboardModel = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    country: {
      type: String,
      default: "India",
    },
    avatar: {
      type: String,
      default: "",
    },
    rank: {
      type: Number,
      default: 1000,
    },
    totalwins: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalgames: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Leaderboard = mongoose.model("Leaderboard", leaderboardModel);

module.exports = Leaderboard;
