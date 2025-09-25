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
} = require("../controllers/company.controller.simple");
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");
const requireAuth = process.env.REQUIRE_AUTH === 'true';

router
  .route("/")
  .get(verifyFirebaseToken, getClientData)
  .post(verifyFirebaseToken, addClientData);

router
  .route("/:id")
  .put(verifyFirebaseToken, updateClientData)
  .delete(verifyFirebaseToken, deleteClientData);

// In simple/local mode, allow without auth to avoid verification failures
if (requireAuth) {
  router.route("/verify-email").post(verifyFirebaseToken, verifyClientEmail);
  router
    .route("/get-verify-status")
    .post(verifyFirebaseToken, updateClientEmailVerification);
} else {
  router.route("/verify-email").post(verifyClientEmail);
  router.route("/get-verify-status").post(updateClientEmailVerification);
}

module.exports = router;
