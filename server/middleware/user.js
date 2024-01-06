const jwt = require('jsonwebtoken');
const User = require('../model/userModel'); // Assuming 'User' is the correct import name for your user model.

const Auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);

    if (!decoded) {
      return res.status(403).json({ error: 'Invalid Token' });
    }

    // Check if the user exists in the database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attach the user and token to the request for further use
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = Auth;