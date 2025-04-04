const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Signup
exports.registerUser = async (req, res) => {
  const { name, playerId, email, password } = req.body;

  try {
    let userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, playerId, email, password });

    res.status(201).json({
      _id: user.id,
      name: user.name,
      playerId: user.playerId,
      email: user.email,
      token: generateToken(user.id),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user.id,
      name: user.name,
      playerId: user.playerId,
      email: user.email,
      token: generateToken(user.id),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
