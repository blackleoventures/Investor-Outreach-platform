const express = require("express");
const {
  getAllTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  getCategories,
  getTones,
  searchTemplates,
  incrementUsage,
  populatePreBuilt,
} = require("../controllers/emailTemplate.controller");

const router = express.Router();

// Get all templates
router.get("/", getAllTemplates);

// Get template categories
router.get("/categories", getCategories);

// Get template tones
router.get("/tones", getTones);

// Search templates
router.get("/search", searchTemplates);

// Get template by ID
router.get("/:id", getTemplate);

// Create new template
router.post("/", createTemplate);

// Update template
router.put("/:id", updateTemplate);

// Delete template
router.delete("/:id", deleteTemplate);

// Duplicate template
router.post("/:id/duplicate", duplicateTemplate);

// Increment usage count
router.post("/:id/usage", incrementUsage);

// Populate pre-built templates (admin only)
router.post("/populate", populatePreBuilt);

module.exports = router; 