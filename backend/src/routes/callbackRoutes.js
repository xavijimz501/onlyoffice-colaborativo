const express = require('express');
const { callback } = require('../controllers/callbackController');
const router = express.Router();
router.post('/callback', callback);
module.exports = router;
