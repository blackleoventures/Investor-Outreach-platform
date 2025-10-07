const express = require("express");
const router = express.Router();
const adminUsersController = require("../controllers/adminUsersController");
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");
const { verifyAdmin } = require("../middlewares/firebaseAuth.middleware");

// All routes require authentication and admin role
router.use(verifyFirebaseToken);
router.use(verifyAdmin);

// Get all admin/subadmin users
router.get("/", adminUsersController.getAllAdminUsers);

// Create new admin/subadmin user
router.post("/", adminUsersController.createAdminUser);

// Update admin/subadmin user
router.put("/:uid", adminUsersController.updateAdminUser);

// Delete admin/subadmin user
router.delete("/:uid", adminUsersController.deleteAdminUser);

module.exports = router;
