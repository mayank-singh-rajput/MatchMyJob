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
    validCompany,
    logout,
    searchCompanys,
    getCompanyById,
    updateInfo,
    updateProfile,
    googleAuth,
} =  require('../controller/company');

const router = express.Router();

router.post('/auth/register', register);

router.post('/auth/login', login);

router.get('/auth/valid', validCompany);

router.get('/auth/logout', logout);

router.get('/user?', searchCompanys);

router.get('/:id', getCompanyById);

router.patch('/update/:id', updateInfo);

router.patch('/update/profile/:id', upload.single('profilePic'), updateProfile);

router.post('/google', googleAuth);

module.exports = router;