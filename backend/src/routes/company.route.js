const express = require("express");
const router = express.Router();

const {
  addClientData,
  deleteClientData,
  getActiveClientData,
  getClientData,
  updateClientData,
  verifyClientEmail,
  updateClientEmailVerification,
} = require("../controllers/company.controller");
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");

router
  .route("/")
  .get(verifyFirebaseToken, getClientData)
  .post(verifyFirebaseToken, addClientData);

router
  .route("/:id")
  .put(verifyFirebaseToken, updateClientData)
  .delete(verifyFirebaseToken, deleteClientData);

router.route("/verify-email").post(verifyFirebaseToken, verifyClientEmail);
router
  .route("/get-verify-status")
  .post(verifyFirebaseToken, updateClientEmailVerification);

module.exports = router;
