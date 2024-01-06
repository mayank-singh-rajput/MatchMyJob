const express = require('express')
const multer = require('multer');

var storage = multer.diskStorage({
  destination:(req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' +file.originalname);
  }
})

var upload = multer({ storage: storage })

const {
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
} =  require('../controller/user');

const { Auth } = require('../middleware/user');

const router = express.Router();

router.post('/auth/register', register);

router.post('/auth/login', login);

router.get('/auth/valid', validUser);

router.get('/auth/logout', logout);

router.get('/api/user?', searchUsers);

router.get('/api/users/:id', getUserById);

router.patch('/api/users/update/:id', updateInfo);

router.patch('/api/users/update/profile/:id', upload.single('profilePic'), updateProfile);

router.patch('/api/users/update/resume/:id', upload.single('resume'), updateResume);

router.post('/api/google', googleAuth);

router.get('/api/user/profile', userProfile);

module.exports = router;