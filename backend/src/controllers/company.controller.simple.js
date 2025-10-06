

exports.addClientData = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      companyName,
      industry,
      position,
      website,
      state,
      city,
      postalCode,
      companyDescription,
      investment,
      revenue,
      fundingStage,
      employees,
    } = req.body;

    const clientData = {
      id: nextId++,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      company_name: companyName,
      industry,
      position,
      website,
      state,
      city,
      postalcode: postalCode ? parseInt(postalCode) : undefined,
      company_desc: companyDescription,
      investment_ask: investment ? parseFloat(investment) : undefined,
      revenue: revenue ? parseFloat(revenue) : undefined,
      fund_stage: fundingStage,
      employees: employees ? parseInt(employees) : undefined,
      email_verified: false,
      archive: false,
      createdAt: new Date(),
    };

    clients.push(clientData);

    res.status(201).json({
      id: clientData.id,
      message: "Client added successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClientData = async (req, res) => {
  try {
    const { email, page = 1, limit = 10, filter = "all" } = req.query;

    let filteredClients = clients;

    if (email) {
      filteredClients = filteredClients.filter(client => client.email === email);
    }

    if (filter === "archived") {
      filteredClients = filteredClients.filter(client => client.archive === true);
    } else if (filter === "active") {
      filteredClients = filteredClients.filter(client => client.archive === false);
    }

    const total = filteredClients.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedClients = filteredClients.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      clients: paginatedClients,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateClientData = async (req, res) => {
  try {
    const { id } = req.params;
    const clientIndex = clients.findIndex(client => client.id == id);

    if (clientIndex === -1) {
      return res.status(404).json({ error: "Client not found" });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      position,
      industry,
      employees,
      website,
      address,
      city,
      state,
      postalCode,
      revenue,
      investment,
      fundingStage,
      archive,
    } = req.body;

    const updatedClientData = {
      ...clients[clientIndex],
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company_name: companyName,
      position,
      industry,
      employees: employees ? parseInt(employees) : undefined,
      website,
      address,
      city,
      state,
      postalcode: postalCode ? parseInt(postalCode) : undefined,
      revenue: revenue ? parseFloat(revenue) : undefined,
      investment_ask: investment ? parseFloat(investment) : undefined,
      fund_stage: fundingStage,
      updatedAt: new Date(),
    };

    if (typeof archive !== "undefined") {
      updatedClientData.archive = archive;
    }

    clients[clientIndex] = updatedClientData;

    res.json(updatedClientData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteClientData = async (req, res) => {
  try {
    const { id } = req.params;
    const clientIndex = clients.findIndex(client => client.id == id);

    if (clientIndex === -1) {
      return res.status(404).json({ error: "Client not found" });
    }

    clients.splice(clientIndex, 1);

    res.status(200).json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
