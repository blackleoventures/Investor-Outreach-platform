const express = require("express");
const router = express.Router();

const clientController = require("../controllers/company.controller");
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");

// Create a new client
router.post("/create", verifyFirebaseToken, clientController.createClient);

// Get all clients (with optional filters)
router.get("/", verifyFirebaseToken, clientController.getAllClients);

// Get a specific client by ID
router.get("/:id", verifyFirebaseToken, clientController.getClientById);

// Update a client
router.put("/:id", verifyFirebaseToken, clientController.updateClient);

// Delete a client
router.delete("/:id", verifyFirebaseToken, clientController.deleteClient);

module.exports = router;
