const express = require("express");
const router = express.Router();

const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");
const {
  createContactList,
  getAllContactLists,
  getContactListsByCompany,
  deleteContactList,
} = require("../controllers/contactList.controller");

router
  .route("/")
  .get(verifyFirebaseToken, getAllContactLists)
  .post(verifyFirebaseToken, createContactList);

router
  .route("/:id")
  .get(verifyFirebaseToken, getContactListsByCompany)
  .delete(verifyFirebaseToken, deleteContactList);

module.exports = router;
