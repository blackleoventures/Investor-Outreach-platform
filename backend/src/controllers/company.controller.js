const { dbHelpers } = require("../config/firebase-db.config");
const {
  VerifyEmailIdentityCommand,
  GetIdentityVerificationAttributesCommand,
} = require("@aws-sdk/client-ses");
const { sesClient } = require("../config/aws.config");

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
    const userEmail = req.user?.email;

    const clientData = {
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
      location: req.body.location || city,
      postalcode: postalCode ? parseInt(postalCode) : undefined,
      company_desc: companyDescription,
      investment_ask: investment || undefined,
      revenue: revenue || undefined,
      fund_stage: fundingStage,
      employees: employees ? parseInt(employees) : undefined,
      archive: false,
      owner_email: userEmail,
    };

    const savedClient = await dbHelpers.create('companies', clientData);

    res.status(201).json({
      success: true,
      client: { id: savedClient.id, ...clientData },
      message: "Client added successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveClientData = async (req, res) => {
  try {
    const { email, page = 1, limit = 10 } = req.query;
    const userEmail = req.user?.email;

    const filters = { archive: false, owner_email: userEmail };
    if (email) {
      filters.email = email;
    }

    const clients = await dbHelpers.getAll('companies', {
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await dbHelpers.count('companies', filters);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      clients,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClientData = async (req, res) => {
  try {
    const { email, page = 1, limit = 10, filter = "all" } = req.query;
    const userEmail = req.user?.email;

    const filters = { owner_email: userEmail };

    if (email) {
      filters.email = email;
    }

    if (filter === "archived") {
      filters.archive = true;
    } else if (filter === "active") {
      filters.archive = false;
    }

    const clients = await dbHelpers.getAll('companies', {
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await dbHelpers.count('companies', filters);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      clients,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateClientData = async (req, res) => {
  try {
    const { id } = req.params;

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
      location: req.body.location || city,
      state,
      postalcode: postalCode ? parseInt(postalCode) : undefined,
      revenue: revenue || undefined,
      investment_ask: investment || undefined,
      fund_stage: fundingStage,
    };

    if (typeof archive !== "undefined") {
      updatedClientData.archive = archive;
    }

    const updatedClient = await dbHelpers.update('companies', id, updatedClientData);

    if (!updatedClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteClientData = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClient = await dbHelpers.delete('companies', id);

    if (!deletedClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.status(200).json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyClientEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const client = await dbHelpers.findOne('companies', { email });
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.email_verified) {
      return res.status(200).json({
        email,
        alreadyVerified: true,
        message: `${email} is already verified in the system.`,
      });
    }

    const command = new VerifyEmailIdentityCommand({ EmailAddress: email });
    await sesClient.send(command);

    res.status(200).json({
      email,
      success: true,
      message: `Verification email sent successfully to ${email}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send verification email",
      error: error.message,
    });
  }
};

exports.updateClientEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const command = new GetIdentityVerificationAttributesCommand({
      Identities: [email],
    });

    const response = await sesClient.send(command);
    const status = response.VerificationAttributes?.[email]?.VerificationStatus;

    if (!status) {
      return res
        .status(404)
        .json({ message: "Email not found in SES identities" });
    }

    const isVerified = status === "Success";

    // Find client by email and update verification status
    const client = await dbHelpers.findOne('companies', { email });
    if (!client) {
      return res.status(404).json({ message: "Client not found in database" });
    }

    await dbHelpers.update('companies', client.id, { email_verified: isVerified });

    res.status(200).json({
      email,
      verified: isVerified,
      success: true,
      message: `Email verification status updated to "${status}"`,
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    res.status(500).json({
      message: "Failed to update verification status",
      error: error.message,
    });
  }
};
