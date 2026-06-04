const express = require('express');
const router = express.Router();
const { search, getTrendingSearches } = require('../controllers/searchController');

router.get('/', search);
router.get('/trending', getTrendingSearches);

module.exports = router;
