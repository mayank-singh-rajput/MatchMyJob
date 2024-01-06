const Message = require('../model/messageModel');
const Chat =  require('../model/chatModel');
const jwt = require('jsonwebtoken');

const sendMessage = async (req, res) => {
  const { chatId, message } = req.body;

  const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;

  try {
    let msg = await Message.create({ sender: rootUserId, message, chatId });
    msg = await (
      await msg.populate('sender', 'name profilePic email')
    ).populate({
      path: 'chatId',
      select: 'chatName isGroup users',
      model: 'Chat',
      populate: {
        path: 'users',
        select: 'name email profilePic',
        model: 'User',
      },
    });
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: msg,
    });
    res.status(200).send(msg);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
};

const getMessages = async (req, res) => {
  const { chatId } = req.params;
  try {
    let messages = await Message.find({ chatId })
      .populate({
        path: 'sender',
        model: 'User',
        select: 'name profilePic email',
      })
      .populate({
        path: 'chatId',
        model: 'Chat',
      });

    res.status(200).json(messages);
  } catch (error) {
    res.sendStatus(500).json({ error: error });
    console.log(error);
  }
};

module.exports = { sendMessage, getMessages };