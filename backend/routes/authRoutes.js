const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");


const router = express.Router();

router.post("/signup", registerUser);
router.post("/signin", loginUser);




module.exports = router;