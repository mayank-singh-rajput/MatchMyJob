const express = require('express')

const router = express.Router();

const { sendMessage, getMessages } = require("../controller/messageControllers");

const { Auth } = require("../middleware/user");

router.post("/", sendMessage);

router.get("/:chatId", getMessages);

module.exports = router;
