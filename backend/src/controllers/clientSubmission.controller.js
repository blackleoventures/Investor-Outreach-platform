const { dbHelpers } = require("../config/firebase-db.config");

const COLLECTION = "clients";

// Get user's submission by userId
const getMySubmission = async (req, res) => {
  try {
    const userId = req.user.uid;

    console.log("[ClientSubmission] Fetching submission for userId:", userId);

    const submission = await dbHelpers.findOne(COLLECTION, { userId });

    if (!submission) {
      console.log("[ClientSubmission] No submission found for userId:", userId);
      return res.status(200).json({
        success: true,
        data: null,
        message: "No submission found",
      });
    }

    console.log("[ClientSubmission] Submission found:", submission.id);

    return res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error("[ClientSubmission] Error fetching submission:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Unable to load your submission. Please try again.",
      },
    });
  }
};

// Initial submission (first-time users)
const submitApplication = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { clientInformation, pitchAnalyses, usageLimits } = req.body;

    console.log("[ClientSubmission] Creating submission for userId:", userId);

    // Validate required fields
    if (!clientInformation) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide your company information to continue.",
        },
      });
    }

    // Validate email format
    if (!clientInformation.email || !clientInformation.email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_EMAIL",
          message: "Please provide a valid email address.",
        },
      });
    }

    // Check if user already has a submission
    const existingSubmission = await dbHelpers.findOne(COLLECTION, { userId });

    if (existingSubmission) {
      console.log("[ClientSubmission] User already has submission:", existingSubmission.id);
      return res.status(400).json({
        success: false,
        error: {
          code: "ALREADY_EXISTS",
          message: "You have already submitted an application. You can update it from your dashboard.",
        },
      });
    }

    const submissionData = {
      userId,
      clientInformation,
      pitchAnalyses: pitchAnalyses || [],
      usageLimits: usageLimits || {
        formEditCount: 1,
        pitchAnalysisCount: pitchAnalyses?.length || 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      },
    };

    const createdSubmission = await dbHelpers.create(COLLECTION, submissionData);

    console.log("[ClientSubmission] Submission created successfully:", createdSubmission.id);

    return res.status(201).json({
      success: true,
      data: createdSubmission,
      message: "Your application has been submitted successfully!",
    });
  } catch (error) {
    console.error("[ClientSubmission] Error creating submission:", error);
    
    // Check for specific errors
    if (error.message.includes("permission")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "You don't have permission to submit applications. Please contact support.",
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "SUBMIT_ERROR",
        message: "Unable to submit your application. Please try again or contact support.",
      },
    });
  }
};

// Update client information (returning users)
const updateClientInfo = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { clientInformation } = req.body;

    console.log("[ClientSubmission] Updating info for userId:", userId);

    if (!clientInformation) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide information to update.",
        },
      });
    }

    // Validate email if provided
    if (clientInformation.email && !clientInformation.email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_EMAIL",
          message: "Please provide a valid email address.",
        },
      });
    }

    // Find user's submission
    const submission = await dbHelpers.findOne(COLLECTION, { userId });

    if (!submission) {
      console.log("[ClientSubmission] No submission found for userId:", userId);
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "No submission found. Please submit your application first.",
        },
      });
    }

    // Check if user can still edit
    if (submission.usageLimits.formEditCount >= submission.usageLimits.maxFormEdits) {
      console.log("[ClientSubmission] Edit limit exceeded for userId:", userId);
      return res.status(403).json({
        success: false,
        error: {
          code: "LIMIT_EXCEEDED",
          message: `You have used all ${submission.usageLimits.maxFormEdits} form edits. Please contact admin@company.com for additional edits.`,
        },
      });
    }

    // Increment formEditCount
    const newFormEditCount = submission.usageLimits.formEditCount + 1;
    const canEditForm = newFormEditCount < submission.usageLimits.maxFormEdits;

    const updatedData = {
      clientInformation,
      usageLimits: {
        ...submission.usageLimits,
        formEditCount: newFormEditCount,
        canEditForm,
      },
    };

    const updatedSubmission = await dbHelpers.update(COLLECTION, submission.id, updatedData);

    console.log(
      "[ClientSubmission] Info updated successfully, edit count:",
      newFormEditCount,
      "/",
      submission.usageLimits.maxFormEdits
    );

    // Add id back to response
    const responseData = {
      id: submission.id,
      userId: submission.userId,
      ...updatedSubmission,
      pitchAnalyses: submission.pitchAnalyses,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Information updated successfully! You have ${
        submission.usageLimits.maxFormEdits - newFormEditCount
      } edit(s) remaining.`,
    });
  } catch (error) {
    console.error("[ClientSubmission] Error updating info:", error);

    if (error.message.includes("permission")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "You don't have permission to update this information.",
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "UPDATE_ERROR",
        message: "Unable to update your information. Please try again.",
      },
    });
  }
};

// Add pitch analysis (returning users)
const addPitchAnalysis = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { pitchAnalysis } = req.body;

    console.log("[ClientSubmission] Adding pitch analysis for userId:", userId);

    if (!pitchAnalysis) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide pitch analysis data.",
        },
      });
    }

    // Validate pitch analysis structure
    if (!pitchAnalysis.summary || !pitchAnalysis.scorecard) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid pitch analysis format. Please try uploading again.",
        },
      });
    }

    // Find user's submission
    const submission = await dbHelpers.findOne(COLLECTION, { userId });

    if (!submission) {
      console.log("[ClientSubmission] No submission found for userId:", userId);
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "No submission found. Please submit your application first.",
        },
      });
    }

    // Check if user can still add pitch analysis
    if (
      submission.usageLimits.pitchAnalysisCount >=
      submission.usageLimits.maxPitchAnalysis
    ) {
      console.log("[ClientSubmission] Analysis limit exceeded for userId:", userId);
      return res.status(403).json({
        success: false,
        error: {
          code: "LIMIT_EXCEEDED",
          message: `You have used all ${submission.usageLimits.maxPitchAnalysis} pitch analyses. Please contact admin@company.com for additional analyses.`,
        },
      });
    }

    // Add analyzedAt timestamp if not present
    const analysisWithTimestamp = {
      ...pitchAnalysis,
      analyzedAt: pitchAnalysis.analyzedAt || new Date().toISOString(),
    };

    // Increment pitchAnalysisCount
    const newPitchAnalysisCount = submission.usageLimits.pitchAnalysisCount + 1;
    const canAnalyzePitch =
      newPitchAnalysisCount < submission.usageLimits.maxPitchAnalysis;

    const updatedPitchAnalyses = [
      ...(submission.pitchAnalyses || []),
      analysisWithTimestamp,
    ];

    const updatedData = {
      pitchAnalyses: updatedPitchAnalyses,
      usageLimits: {
        ...submission.usageLimits,
        pitchAnalysisCount: newPitchAnalysisCount,
        canAnalyzePitch,
      },
    };

    const updatedSubmission = await dbHelpers.update(COLLECTION, submission.id, updatedData);

    console.log(
      "[ClientSubmission] Pitch analysis added, count:",
      newPitchAnalysisCount,
      "/",
      submission.usageLimits.maxPitchAnalysis
    );

    // Add id and other fields back to response
    const responseData = {
      id: submission.id,
      userId: submission.userId,
      clientInformation: submission.clientInformation,
      ...updatedSubmission,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Pitch analysis added successfully! You have ${
        submission.usageLimits.maxPitchAnalysis - newPitchAnalysisCount
      } analysis credit(s) remaining.`,
    });
  } catch (error) {
    console.error("[ClientSubmission] Error adding pitch analysis:", error);

    if (error.message.includes("permission")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "You don't have permission to add pitch analyses.",
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "ADD_ERROR",
        message: "Unable to add pitch analysis. Please try again.",
      },
    });
  }
};

module.exports = {
  getMySubmission,
  submitApplication,
  updateClientInfo,
  addPitchAnalysis,
};
