const { db } = require("../config/firebase");
const { preBuiltTemplates } = require("../scripts/populateTemplates");

// Get all templates (pre-built + custom)
exports.getAllTemplates = async (req, res) => {
  try {
    const { category, tone, companyId } = req.query;
    
    // Get templates from Firebase
    const templatesRef = db.collection('emailTemplates');
    let query = templatesRef.where('isActive', '==', true);
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    if (tone) {
      query = query.where('tone', '==', tone);
    }
    
    const snapshot = await query.get();
    let templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Apply company filtering in memory
    if (companyId) {
      templates = templates.filter(template => 
        template.companyId === companyId || template.isPreBuilt === true
      );
    } else {
      templates = templates.filter(template => template.isPreBuilt === true);
    }
    
    // Sort templates
    templates.sort((a, b) => {
      if (a.isPreBuilt !== b.isPreBuilt) {
        return b.isPreBuilt ? 1 : -1;
      }
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error("getAllTemplates error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get template by ID
exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const templateRef = db.collection('emailTemplates').doc(id);
    const templateDoc = await templateRef.get();
    
    if (!templateDoc.exists) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const template = {
      id: templateDoc.id,
      ...templateDoc.data()
    };
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error("getTemplate error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create custom template
exports.createTemplate = async (req, res) => {
  try {
    const { name, category, subject, body, variables, tone, tags, companyId } = req.body;
    
    if (!name || !category || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const templateRef = db.collection('emailTemplates').doc();
    const template = {
      name,
      category,
      subject,
      body,
      variables: variables || [],
      tone: tone || "Professional",
      tags: tags || [],
      companyId,
      isPreBuilt: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await templateRef.set(template);
    
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error("createTemplate error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Prevent updating pre-built templates
    const templateRef = db.collection('emailTemplates').doc(id);
    const templateDoc = await templateRef.get();
    
    if (!templateDoc.exists) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const template = templateDoc.data();
    if (template.isPreBuilt) {
      return res.status(400).json({ error: "Cannot modify pre-built templates" });
    }
    
    await templateRef.update({
      ...updates,
      updatedAt: new Date(),
    });
    // Get the updated template
    const updatedDoc = await templateRef.get();
    const updatedTemplate = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
    
    if (!updatedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json({ success: true, data: updatedTemplate });
  } catch (error) {
    console.error("updateTemplate error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await EmailTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    if (template.isPreBuilt) {
      return res.status(400).json({ error: "Cannot delete pre-built templates" });
    }
    
    await EmailTemplate.findByIdAndDelete(id);
    
    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error("deleteTemplate error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Duplicate template
exports.duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName, companyId } = req.body;
    
    const originalTemplate = await EmailTemplate.findById(id);
    if (!originalTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const duplicatedTemplate = await EmailTemplate.create({
      name: newName || `${originalTemplate.name} (Copy)`,
      category: originalTemplate.category,
      subject: originalTemplate.subject,
      body: originalTemplate.body,
      variables: originalTemplate.variables,
      tone: originalTemplate.tone,
      tags: originalTemplate.tags,
      companyId: companyId || originalTemplate.companyId,
      isPreBuilt: false,
    });
    
    res.status(201).json({ success: true, data: duplicatedTemplate });
  } catch (error) {
    console.error("duplicateTemplate error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get template categories
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      "Initial Outreach",
      "Follow-up", 
      "Thank You",
      "Investor Update",
      "Custom"
    ];
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("getCategories error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get template tones
exports.getTones = async (req, res) => {
  try {
    const tones = [
      "Professional",
      "Persuasive", 
      "Friendly",
      "Casual"
    ];
    
    res.json({ success: true, data: tones });
  } catch (error) {
    console.error("getTones error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Search templates
exports.searchTemplates = async (req, res) => {
  try {
    const { q, category, tone, tags } = req.query;
    
    let query = { isActive: true };
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { body: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (tone) {
      query.tone = tone;
    }
    
    if (tags) {
      const tagArray = tags.split(",").map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    const templates = await EmailTemplate.find(query).sort({ 
      isPreBuilt: -1, 
      usageCount: -1, 
      name: 1 
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error("searchTemplates error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Increment usage count
exports.incrementUsage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await EmailTemplate.findByIdAndUpdate(
      id,
      { 
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      },
      { new: true }
    );
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error("incrementUsage error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Populate pre-built templates (admin only)
exports.populatePreBuilt = async (req, res) => {
  try {
    // Clear existing pre-built templates
    await EmailTemplate.deleteMany({ isPreBuilt: true });
    
    // Insert new templates
    const result = await EmailTemplate.insertMany(preBuiltTemplates);
    
    res.json({ 
      success: true, 
      message: `Successfully populated ${result.length} pre-built templates`,
      data: result 
    });
  } catch (error) {
    console.error("populatePreBuilt error:", error);
    res.status(500).json({ error: error.message });
  }
}; 