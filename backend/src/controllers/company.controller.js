const { dbHelpers } = require("../config/firebase-db.config");
const {
  VerifyEmailIdentityCommand,
  GetIdentityVerificationAttributesCommand,
} = require("@aws-sdk/client-ses");
const { sesClient } = require("../config/aws.config");

const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  CLIENT_NOT_FOUND: "CLIENT_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  SERVER_ERROR: "SERVER_ERROR",
};

exports.createClient = async (req, res) => {
  try {
    const {
      companyName,
      founderName,
      email,
      phone,
      fundingStage,
      revenue,
      investment,
      industry,
      city,
      gmailAppPassword,
    } = req.body;

    const userEmail = req.user?.email;

    if (
      !companyName ||
      !founderName ||
      !email ||
      !phone ||
      !fundingStage ||
      !revenue ||
      !investment ||
      !industry ||
      !city
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "All required fields must be provided",
          fields: {
            companyName: !companyName,
            founderName: !founderName,
            email: !email,
            phone: !phone,
            fundingStage: !fundingStage,
            revenue: !revenue,
            investment: !investment,
            industry: !industry,
            city: !city,
          },
        },
      });
    }

    if (gmailAppPassword) {
      const cleanPassword = gmailAppPassword.replace(/\s/g, "");
      if (
        cleanPassword.length !== 16 ||
        !/^[a-zA-Z0-9]{16}$/.test(cleanPassword)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: "Invalid Gmail App Password format",
            field: "gmailAppPassword",
          },
        });
      }
    }

    const existingClient = await dbHelpers.findOne("clients", {
      email,
      ownerEmail: userEmail,
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: {
          code: ERROR_CODES.DUPLICATE_EMAIL,
          message: "Client with this email already exists",
          field: "email",
        },
      });
    }

    const clientData = {
      founderName,
      email,
      phone,
      companyName,
      industry,
      fundingStage,
      revenue,
      investment,
      city,
      ownerEmail: userEmail,
      gmailAppPassword: gmailAppPassword
        ? gmailAppPassword.replace(/\s/g, "")
        : "",
      emailSendingEnabled: !!gmailAppPassword,
      archived: false,
      emailVerified: false,
    };

    const savedClient = await dbHelpers.create("clients", clientData);

    res.status(201).json({
      success: true,
      data: savedClient,
      message: "Client created successfully",
    });
  } catch (error) {
    console.error("[Create Client Error]:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: "Internal server error",
      },
    });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const userEmail = req.user?.email;

    const clients = await dbHelpers.getAll("clients", {
      //  filters: { ownerEmail: userEmail },
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("[Get Clients Error]:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: "Internal server error",
      },
    });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;

    const client = await dbHelpers.getById("clients", id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.CLIENT_NOT_FOUND,
          message: "Client not found",
        },
      });
    }

    if (client.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Access denied",
        },
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("[Get Client Error]:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: "Internal server error",
      },
    });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;

    const existingClient = await dbHelpers.getById("clients", id);

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.CLIENT_NOT_FOUND,
          message: "Client not found",
        },
      });
    }

    if (existingClient.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Access denied",
        },
      });
    }

    const {
      companyName,
      founderName,
      email,
      phone,
      fundingStage,
      revenue,
      investment,
      industry,
      city,
      gmailAppPassword,
      archived,
    } = req.body;

    if (gmailAppPassword) {
      const cleanPassword = gmailAppPassword.replace(/\s/g, "");
      if (
        cleanPassword.length !== 16 ||
        !/^[a-zA-Z0-9]{16}$/.test(cleanPassword)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: "Invalid Gmail App Password format",
            field: "gmailAppPassword",
          },
        });
      }
    }

    const updatedData = {};

    if (founderName) updatedData.founderName = founderName;
    if (companyName) updatedData.companyName = companyName;
    if (email) updatedData.email = email;
    if (phone) updatedData.phone = phone;
    if (fundingStage) updatedData.fundingStage = fundingStage;
    if (revenue) updatedData.revenue = revenue;
    if (investment) updatedData.investment = investment;
    if (industry) updatedData.industry = industry;
    if (city) updatedData.city = city;

    if (typeof archived !== "undefined") {
      updatedData.archived = archived;
    }

    if (gmailAppPassword) {
      updatedData.gmailAppPassword = gmailAppPassword.replace(/\s/g, "");
      updatedData.emailSendingEnabled = true;
    }

    const updatedClient = await dbHelpers.update("clients", id, updatedData);

    res.json({
      success: true,
      data: updatedClient,
      message: "Client updated successfully",
    });
  } catch (error) {
    console.error("[Update Client Error]:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: "Internal server error",
      },
    });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;

    const existingClient = await dbHelpers.getById("clients", id);

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.CLIENT_NOT_FOUND,
          message: "Client not found",
        },
      });
    }

    if (existingClient.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Access denied",
        },
      });
    }

    await dbHelpers.delete("clients", id);

    res.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("[Delete Client Error]:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: "Internal server error",
      },
    });
  }
};

exports.verifyClientEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const client = await dbHelpers.findOne("companies", { email });
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
    const client = await dbHelpers.findOne("companies", { email });
    if (!client) {
      return res.status(404).json({ message: "Client not found in database" });
    }

    await dbHelpers.update("companies", client.id, {
      email_verified: isVerified,
    });

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
