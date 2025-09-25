const { dbHelpers } = require("../config/firebase-db.config");

exports.uploadContactList = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { company_id, campaign_id } = req.body;
    const userEmail = req.user?.email;
    
    if (!company_id || !campaign_id) {
      return res.status(400).json({ 
        error: "Company ID and Campaign ID are required" 
      });
    }

    // Parse CSV data and create contact list
    const csvData = req.file.buffer.toString();
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const contact = {};
        headers.forEach((header, index) => {
          contact[header] = values[index] || '';
        });
        contacts.push(contact);
      }
    }

    const contactListData = {
      company_id,
      campaign_id,
      contacts,
      total_contacts: contacts.length,
      owner_email: userEmail,
      uploaded_at: new Date()
    };

    const savedContactList = await dbHelpers.create('contact_lists', contactListData);

    res.status(201).json({
      id: savedContactList.id,
      message: "Contact list uploaded successfully",
      total_contacts: contacts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getContactLists = async (req, res) => {
  try {
    const { company_id, campaign_id, page = 1, limit = 10 } = req.query;
    const userEmail = req.user?.email;

    const filters = { owner_email: userEmail };
    if (company_id) filters.company_id = company_id;
    if (campaign_id) filters.campaign_id = campaign_id;

    const contactLists = await dbHelpers.getAll('contact_lists', {
      filters,
      sortBy: 'uploaded_at',
      sortOrder: 'desc',
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await dbHelpers.count('contact_lists', filters);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      contact_lists: contactLists,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getContactListById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contactList = await dbHelpers.getById('contact_lists', id);
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }

    res.json(contactList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteContactList = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedContactList = await dbHelpers.delete('contact_lists', id);

    if (!deletedContactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }

    res.status(200).json({ message: "Contact list deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
