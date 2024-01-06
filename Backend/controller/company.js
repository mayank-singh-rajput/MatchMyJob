require("dotenv").config();
const company = require('../model/companyModel');
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
  const { companyName, email, password, location, description, startedIn } = req.body;
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }
  const splitToken = token.split(" ")[1];
  
  try {
    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;
    const contacts = rootUserId;
    
    // Check if a company with the same email already exists
    const existingCompany = await company.findOne({ email });
    if (existingCompany) {
      return res.status(400).json({ error: 'Company already exists' });
    }
    
    const newCompany = new company({ companyName, email, password, contacts, location, description, startedIn });
    const token = "Bearer " + await newCompany.generateAuthToken();
    await newCompany.save();

    res.cookie("companyToken", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ message: 'success', token: token });
  } catch (error) {
    res.status(500).send({ error: 'Error in register' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const valid = await company.findOne({ email });
    if (!valid) return res.status(200).json({ message: 'Company dont exist' });
    const validPassword = await bcrypt.compare(password, valid.password);
    if (!validPassword) {
      return res.status(200).json({ message: 'Invalid Credentials' });
    } else {
      const token = "Bearer "+ await valid.generateAuthToken();
      await valid.save();
      res.cookie('companyToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ token: token, status: 200 });
    }
  } catch (error) {
    res.status(500).send({ message: 'error' });
  }
};

const validCompany = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const companyId = decoded.id;

    const validCompany = await company.findById(companyId).select('-password');
    if (!validCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.status(200).json({
      company: validCompany,
      token: splitToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const logout = async (req, res) => {
  req.rootCompany.tokens = req.rootCompany.tokens.filter((e) => e.token != req.token);
  await req.rootCompany.save();
  res.clearCookie('companyToken');
  res.status(200).json({ message: 'Sign-out successful' });
};

const searchCompanys = async (req, res) => {
  const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const splitToken = token.split(' ')[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootCompanyId = decoded.id;

  const search = req.query.search
    ? {
        $or: [
          { companyName: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  const companys = await company.find(search).find({ _id: { $ne: rootCompanyId } });
  res.status(200).send(companys);
};

const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
    const selectedCompany = await company.findOne({ _id: id }).select('-password');
    res.status(200).json(selectedCompany);
  } catch (error) {
    res.status(500).json({ error: error });
  }
};

const updateInfo = async (req, res) => {
    const { id } = req.params;
    const { ...data } = req.body;
    try {
      const updatedCompany = await company.findByIdAndUpdate(id, data, { new: true });
      
      if (!updatedCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }
      
      return res.json(updatedCompany);
    } catch (error) {
      console.error('Error updating company:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
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
    const updatedCompany = await company.findByIdAndUpdate(id, { profilePic });
    return updatedCompany;
}

const googleAuth = async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }
  const splitToken = token.split(" ")[1];
  const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
  const rootUserId = decoded.id;
  const contacts = rootUserId;

  try {
    const { tokenId } = req.body;
    const client = new OAuth2Client(process.env.CLIENT_ID);
    const verify = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.CLIENT_ID,
    });
    const { email_verified, email, name, picture, location } = verify.payload;
    if (!email_verified) res.json({ message: 'Email Not Verified' });
    const companyExist = await company.findOne({ email }).select('-password');

    if (companyExist) {
      const token = "Bearer "+ await companyExist.generateAuthToken();
      res.cookie('companyToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ token: token, company: companyExist });
    } else {
      const password = email + process.env.CLIENT_ID;
      const newCompany = await company({
        companyName: name,
        email,
        password,
        contacts,
        location,
        photo: picture,
      });
      await newCompany.save();
      const token = "Bearer "+ await newCompany.generateAuthToken();
      res.cookie('companyToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res
        .status(200)
        .json({ message: 'Company registered Successfully', token: token });
    }
  } catch (error) {
    res.status(500).json({ error: error });
    console.log('error in googleAuth backend' + error);
  }
};

module.exports = {
  register,
  login,
  validCompany,
  logout,
  searchCompanys,
  getCompanyById,
  updateInfo,
  updateProfile,
  googleAuth,
};