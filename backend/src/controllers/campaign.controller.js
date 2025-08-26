const { dbHelpers } = require("../config/firebase-db.config");

exports.createCampaign = async (req, res) => {
  try {
    const campaignData = req.body;
    
    const savedCampaign = await dbHelpers.create('campaigns', campaignData);

    res.status(201).json({
      id: savedCampaign.id,
      message: "Campaign created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { company_id, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (company_id) {
      filters.company_id = company_id;
    }

    const campaigns = await dbHelpers.getAll('campaigns', {
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await dbHelpers.count('campaigns', filters);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      campaigns,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await dbHelpers.getById('campaigns', id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCampaign = await dbHelpers.update('campaigns', id, updateData);

    if (!updatedCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(updatedCampaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCampaign = await dbHelpers.delete('campaigns', id);

    if (!deletedCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
