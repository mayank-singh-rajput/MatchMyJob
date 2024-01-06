const express = require('express');
const router = express.Router();

const { Auth } = require('../middleware/user');

const {
  accessChats,
  fetchAllChats,
  creatGroup,
  renameGroup,
  addToGroup,
  removeFromGroup,
} = require('../controller/chatControllers');

router.post('/', accessChats);

router.get('/', fetchAllChats);

router.post('/group', creatGroup);

router.patch('/group/rename', renameGroup);

router.patch('/groupAdd', addToGroup);

router.patch('/groupRemove', removeFromGroup);

module.exports = router;