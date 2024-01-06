require("dotenv").config();
const user = require('../model/userModel');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const  { OAuth2Client } = require('google-auth-library');

const fs = require('fs')
const util = require('util')
const unlinkFile = util.promisify(fs.unlink)
const { uploadFile } = require('../s3')
const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION

const register = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  try {
    const existingUser = await user.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: 'User already Exits' });
    const fullname = firstname + ' ' + lastname;
    const newuser = new user({ email, password, name: fullname });
    const token = "Bearer "+ await newuser.generateAuthToken();
    await newuser.save();
    res.cookie("userToken", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ message: 'success', token: token });
  } catch (error) {
    // console.log('Error in register ' + error);
    res.status(500).send({ error: 'Error in register' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const valid = await user.findOne({ email });
    if (!valid) return res.status(200).json({ message: 'User dont exist' });
    const validPassword = await bcrypt.compare(password, valid.password);
    if (!validPassword) {
      return res.status(200).json({ message: 'Invalid Credentials' });
    } else {
      const token = "Bearer "+ await valid.generateAuthToken();
      await valid.save();
      res.cookie('userToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ token: token, status: 200 });
    }
  } catch (error) {
    res.status(500).send({ message: 'error' });
  }
};

const validUser = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(200).json({ message: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const userId = decoded.id;

    const validUser = await user.findById(userId).select('-password');
    if (!validUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: validUser,
      token: splitToken,
    });
  } catch (error) {
    // res.status(500).json({ error: 'Internal Server Error' });
  }
};

const logout = async (req, res) => {
  req.rootUser.tokens = req.rootUser.tokens.filter((e) => e.token != req.token);
  await req.rootUser.save();
  res.clearCookie('userToken');
  res.status(200).json({ message: 'Sign-out successful' });
};

const searchUsers = async (req, res) => {
  const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;

  const search = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  const users = await user.find(search).find({ _id: { $ne: rootUserId } });
  res.status(200).send(users);
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const selectedUser = await user.findOne({ _id: id }).select('-password');
    res.status(200).json(selectedUser);
  } catch (error) {
    res.status(500).json({ error: error });
  }
};

const updateInfo = async (req, res) => {
  const { id } = req.params;
  const { bio, name, contact, email, password } = req.body;
  const updatedUser = await user.findByIdAndUpdate(id, { name, bio, contact, email, password });
  return updatedUser;
};

const updateProfile = async(req, res) => {
    const { id } = req.params;
    const File = req.file
    if (!File) {
      console.log("No file uploaded.");
      return
    }

    const result = await uploadFile(File);
    await unlinkFile(File.path);
    const imagePath = `https://${bucketName}.s3.${region}.amazonaws.com/${result.Key}`;

    const profilePic = imagePath;
    const updatedUser = await user.findByIdAndUpdate(id, { profilePic });
    return updatedUser;
}

const updateResume = async(req, res) => {
  const { id } = req.params;
  const File = req.file
  if (!File) {
    console.log("No file uploaded.");
    return
  }

  const result = await uploadFile(File);
  await unlinkFile(File.path);
  const imagePath = `https://${bucketName}.s3.${region}.amazonaws.com/${result.Key}`;

  const resume = imagePath;
  const updatedUser = await user.findByIdAndUpdate(id, { resume });
  return updatedUser;
}

const googleAuth = async (req, res) => {
  try {
    const { tokenId } = req.body;
    const client = new OAuth2Client(process.env.CLIENT_ID);
    const verify = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.CLIENT_ID,
    });
    const { email_verified, email, name, picture } = verify.payload;
    if (!email_verified) res.json({ message: 'Email Not Verified' });
    const userExist = await user.findOne({ email }).select('-password');

    if (userExist) {
      const token = "Bearer "+ await userExist.generateAuthToken();
      res.cookie('userToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ token: token, user: userExist });
    } else {
      const password = email + process.env.CLIENT_ID;
      const newUser = await user({
        name: name,
        profilePic: picture,
        password,
        email,
      });
      await newUser.save();
      const token = "Bearer "+ await newUser.generateAuthToken();
      res.cookie('userToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res
        .status(200)
        .json({ message: 'User registered Successfully', token: token });
    }
  } catch (error) {
    res.status(500).json({ error: error });
    console.log('error in googleAuth backend' + error);
  }
};

const userProfile = async(req, res) => {
  try{
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;

    const userData = await user.findById(rootUserId);

    res.status(200).json(userData);
  }catch(error){
    res.status(500).json({ error: error });
    console.log('error in user profile backend' + error);
  }
}

module.exports = {
  register,
  login,
  validUser,
  logout,
  searchUsers,
  getUserById,
  updateInfo,
  updateProfile,
  updateResume,
  googleAuth,
  userProfile,
};