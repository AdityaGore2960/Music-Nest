const express = require('express');
const router = express.Router();
const {
  getStats, getUsers, updateUserRole, toggleUserBan, deleteUser,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All admin routes require authentication and admin role
router.use(protect, roleMiddleware('admin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/ban', toggleUserBan);
router.delete('/users/:id', deleteUser);

module.exports = router;
