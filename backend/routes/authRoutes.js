const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", registerUser);
router.post("/signin", loginUser);
// This route now simply returns the authenticated user's own data (already fetched by 'protect')
router.get("/profile", protect, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }
  res.json(req.user);
});


module.exports = router;