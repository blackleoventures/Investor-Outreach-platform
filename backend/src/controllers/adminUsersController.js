const admin = require("../config/firebase.config");
const { db } = require("../config/firebase.config");

const adminUsersController = {
  // Get all admin and subadmin users
  async getAllAdminUsers(req, res) {
    try {
      const usersSnapshot = await db
        .collection("users")
        .where("role", "in", ["admin", "subadmin"])
        .get();

      const users = [];
      usersSnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      return res.status(200).json({
        success: true,
        message: "Admin users retrieved successfully.",
        data: users,
      });
    } catch (error) {
      console.error("Error fetching admin users:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to retrieve admin users. Please try again.",
      });
    }
  },

  // Create new admin/subadmin user
  async createAdminUser(req, res) {
    try {
      const { email, password, displayName, photoURL } = req.body;

      if (!email || !password || !displayName) {
        return res.status(400).json({
          success: false,
          message: "Email, password, and name are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }

      // Build user creation data - only include photoURL if it's a valid non-empty string
      const authUserData = {
        email: email,
        password: password,
        displayName: displayName,
        disabled: false,
      };

      // Only add photoURL if it exists and is not empty
      if (photoURL && photoURL.trim() !== "") {
        authUserData.photoURL = photoURL.trim();
      }

      // Create user in Firebase Authentication
      const userRecord = await admin.auth().createUser(authUserData);

      // Create user document in Firestore
      const timestamp = new Date().toISOString();
      const newUserData = {
        uid: userRecord.uid,
        email: email,
        displayName: displayName,
        role: "subadmin",
        password: password,
        photoURL: photoURL && photoURL.trim() !== "" ? photoURL.trim() : "",
        active: true,
        createdAt: timestamp,
        lastLogin: null, // User hasn't logged in yet
      };

      await db.collection("users").doc(userRecord.uid).set(newUserData);

      return res.status(201).json({
        success: true,
        message: `Account created successfully for ${displayName}.`,
        data: { uid: userRecord.uid, ...newUserData },
      });
    } catch (error) {
      console.error("Error creating admin user:", error.message);

      if (error.code === "auth/email-already-exists") {
        return res.status(409).json({
          success: false,
          message:
            "This email is already registered. Please use a different email.",
        });
      }

      if (error.code === "auth/invalid-email") {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address.",
        });
      }

      if (error.code === "auth/weak-password") {
        return res.status(400).json({
          success: false,
          message: "Password is too weak. Please choose a stronger password.",
        });
      }

      if (error.code === "auth/invalid-photo-url") {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid photo URL or leave it empty.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to create account. Please try again.",
      });
    }
  },

  // Update admin/subadmin user
  async updateAdminUser(req, res) {
    try {
      const { uid } = req.params;
      const { displayName, photoURL, active, password } = req.body;

      if (!uid) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      const userDoc = await db.collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      const userData = userDoc.data();

      if (userData.role !== "admin" && userData.role !== "subadmin") {
        return res.status(403).json({
          success: false,
          message: "Cannot modify non-admin user accounts.",
        });
      }

      // Update Firebase Authentication
      const authUpdateData = {};
      if (displayName) authUpdateData.displayName = displayName;

      // Handle photoURL carefully
      if (photoURL !== undefined) {
        if (photoURL && photoURL.trim() !== "") {
          authUpdateData.photoURL = photoURL.trim();
        }
      }

      // Update password if provided
      if (password && password.trim() !== "") {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters long.",
          });
        }
        authUpdateData.password = password.trim();
      }

      if (active === false) authUpdateData.disabled = true;
      if (active === true) authUpdateData.disabled = false;

      if (Object.keys(authUpdateData).length > 0) {
        await admin.auth().updateUser(uid, authUpdateData);
      }

      // Update Firestore document
      const firestoreUpdateData = {
        updatedAt: new Date().toISOString(),
      };
      if (displayName) firestoreUpdateData.displayName = displayName;
      if (photoURL !== undefined) {
        firestoreUpdateData.photoURL =
          photoURL && photoURL.trim() !== "" ? photoURL.trim() : "";
      }
      if (active !== undefined) firestoreUpdateData.active = active;
      if (password && password.trim() !== "")
        firestoreUpdateData.password = password.trim();

      await db.collection("users").doc(uid).update(firestoreUpdateData);

      return res.status(200).json({
        success: true,
        message: "Account updated successfully.",
        data: { uid, ...firestoreUpdateData },
      });
    } catch (error) {
      console.error("Error updating admin user:", error.message);

      if (error.code === "auth/user-not-found") {
        return res.status(404).json({
          success: false,
          message: "User account not found in authentication system.",
        });
      }

      if (error.code === "auth/invalid-photo-url") {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid photo URL or leave it empty.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to update account. Please try again.",
      });
    }
  },

  // Delete admin/subadmin user
  async deleteAdminUser(req, res) {
    try {
      const { uid } = req.params;

      if (!uid) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      // Prevent deleting self
      if (uid === req.user.uid) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account.",
        });
      }

      const userDoc = await db.collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      const userData = userDoc.data();

      if (userData.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin accounts cannot be deleted.",
        });
      }

      // Delete from Firebase Authentication
      await admin.auth().deleteUser(uid);

      // Delete from Firestore
      await db.collection("users").doc(uid).delete();

      return res.status(200).json({
        success: true,
        message: `Account for ${userData.displayName} has been deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting admin user:", error.message);

      if (error.code === "auth/user-not-found") {
        return res.status(404).json({
          success: false,
          message: "User account not found in authentication system.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to delete account. Please try again.",
      });
    }
  },
};

module.exports = adminUsersController;
