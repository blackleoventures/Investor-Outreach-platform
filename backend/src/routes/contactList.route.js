const express = require("express");
const router = express.Router();

const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");
const {
  uploadContactList,
  getContactLists,
  getContactListById,
  deleteContactList,
} = require("../controllers/contactList.controller");

router
  .route("/")
  .get(verifyFirebaseToken, getContactLists)
  .post(verifyFirebaseToken, uploadContactList);

router
  .route("/:id")
  .get(verifyFirebaseToken, getContactListById)
  .delete(verifyFirebaseToken, deleteContactList);

module.exports = router;
