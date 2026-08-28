const express = require('express');
const router = express.Router();
const habitCtrl = require('../controllers/habitController');
const logCtrl = require('../controllers/logController');
const analyticsCtrl = require('../controllers/analyticsController');
const progCtrl = require('../controllers/progressionController');
const catCtrl = require('../controllers/categoryController');

// Habit Routes
router.get('/habits', habitCtrl.getHabits);
router.get('/habits/:id', habitCtrl.getHabitById);
router.post('/habits', habitCtrl.createHabit);
router.put('/habits/:id', habitCtrl.updateHabit);
router.delete('/habits/:id', habitCtrl.deleteHabit);

// Category Routes
router.get('/categories', catCtrl.getCategories);
router.post('/categories', catCtrl.createCategory);
router.put('/categories/:id', catCtrl.updateCategory);
router.delete('/categories/:id', catCtrl.deleteCategory);

// Log Routes
router.post('/logs/toggle', logCtrl.toggleLog);

// Progression Routes
router.get('/progression', progCtrl.getProgression);
router.get('/progression/history', progCtrl.getXPHistory);
router.get('/progression/achievements', progCtrl.getAchievements);

// Analytics & Backup Routes
router.get('/analytics', analyticsCtrl.getGlobalAnalytics);
router.get('/backup/export', analyticsCtrl.exportBackup);
router.post('/backup/import', analyticsCtrl.importBackup);

module.exports = router;
