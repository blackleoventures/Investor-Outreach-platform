const fs = require("fs").promises;
const Papa = require("papaparse");
const { db } = require("../config/firebase");
const transformFrontendToDB = require("../utils/functions");
const { EXPECTED_KEYS } = require("../utils/data");

exports.getPaginatedInvestors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      fund_stage = [],
      fund_type = [],
      sector = [],
    } = req.query;

    const matchStage = {};

    if (search.trim()) {
      matchStage.$text = { $search: search.trim() };
    }

    if (Array.isArray(fund_stage) && fund_stage.length > 0) {
      matchStage.fund_stage = {
        $in: fund_stage.map((s) => s.toLowerCase()),
      };
    }

    if (Array.isArray(fund_type) && fund_type.length > 0) {
      matchStage.fund_type = {
        $in: fund_type.map((t) => t.toLowerCase()),
      };
    }

    if (Array.isArray(sector) && sector.length > 0) {
      matchStage.sector_focus = {
        $elemMatch: {
          $in: sector.map((s) => s.toLowerCase()),
        },
      };
    }

    // const pipeline = [
    //   { $match: matchStage },
    //   { $sort: { createdAt: -1 } },
    //   { $skip: (page - 1) * limit },
    //   { $limit: parseInt(limit) },
    // ];

    // const explain = await Investor.collection
    //   .aggregate(pipeline)
    //   .explain("executionStats");
    // console.log(
    //   "Explain Stats:",
    //   JSON.stringify(explain.executionStats, null, 2)
    // );

    // Get investors from Firebase with filtering
    const investorsRef = db.collection('investors');
    let query = investorsRef;

    // Apply filters
    if (search.trim()) {
      // For Firebase, we'll need to implement text search differently
      // For now, we'll get all and filter in memory
    }

    if (Array.isArray(fund_stage) && fund_stage.length > 0) {
      query = query.where('fund_stage', 'in', fund_stage.map(s => s.toLowerCase()));
    }

    if (Array.isArray(fund_type) && fund_type.length > 0) {
      query = query.where('fund_type', 'in', fund_type.map(t => t.toLowerCase()));
    }

    // Note: Firebase doesn't support array queries like MongoDB
    // We'll need to handle sector filtering differently

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const allInvestors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Apply sector filtering in memory
    let filteredInvestors = allInvestors;
    if (Array.isArray(sector) && sector.length > 0) {
      filteredInvestors = allInvestors.filter(investor => 
        investor.sector_focus && 
        sector.some(s => investor.sector_focus.includes(s.toLowerCase()))
      );
    }

    // Apply search filtering in memory
    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredInvestors = filteredInvestors.filter(investor =>
        investor.partner_name?.toLowerCase().includes(searchTerm) ||
        investor.partner_email?.toLowerCase().includes(searchTerm) ||
        investor.firm_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvestors = filteredInvestors.slice(startIndex, endIndex);

    const result = {
      docs: paginatedInvestors,
      totalDocs: filteredInvestors.length,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(filteredInvestors.length / parseInt(limit)),
      hasNextPage: endIndex < filteredInvestors.length,
      hasPrevPage: parseInt(page) > 1,
      nextPage: endIndex < filteredInvestors.length ? parseInt(page) + 1 : null,
      prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null,
    };

    res.status(200).json(result);
  } catch (err) {
    console.error("Error in getPaginatedInvestors:", err);
    res.status(500).json({ error: err.message });
  }
};

// Controller to add investors data manually
exports.bulkAddInvestors = async (req, res) => {
  try {
    const investorData = req.body;

    if (!Array.isArray(investorData) || investorData.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid request: Array of investor data is required" });
    }

    const invalid = investorData.find((inv) => !inv["partner_email"]);
    if (invalid) {
      return res.status(400).json({
        error: "Each investor must have partner_email",
      });
    }

    // Normalize each investor
    const normalizedData = investorData.map((item) =>
      transformFrontendToDB(item)
    );

    // Add investors to Firebase
    const batch = db.batch();
    const results = [];

    for (const investor of normalizedData) {
      const investorRef = db.collection('investors').doc();
      batch.set(investorRef, {
        ...investor,
        createdAt: new Date(),
      });
      results.push({ id: investorRef.id, ...investor });
    }

    await batch.commit();

    res.status(201).json({
      ids: results.map((doc) => doc.id),
      message: `Successfully added ${results.length} investors`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to add investors",
      details: error.message,
    });
  }
};

exports.uploadCSV = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const filePath = req.file.path;
    const fileContent = await fs.readFile(filePath, "utf-8");

    const { data, errors, meta } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    await fs.unlink(filePath).catch(console.error); // Clean up file

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Invalid CSV format", details: errors });
    }

    // Validate headers
    const csvKeys = meta.fields || [];
    const missingKeys = EXPECTED_KEYS.filter((key) => !csvKeys.includes(key));
    const unexpectedKeys = csvKeys.filter(
      (key) => !EXPECTED_KEYS.includes(key)
    );

    if (missingKeys.length > 0 || unexpectedKeys.length > 0) {
      return res.status(400).json({
        error: "CSV header mismatch",
        missingKeys,
        unexpectedKeys,
        expectedKeys: EXPECTED_KEYS,
        receivedKeys: csvKeys,
      });
    }

    // Normalize CSV records
    const records = transformFrontendToDB(data);

    // Add investors to Firebase
    const batch = db.batch();
    const results = [];

    for (const investor of records) {
      const investorRef = db.collection('investors').doc();
      batch.set(investorRef, {
        ...investor,
        createdAt: new Date(),
      });
      results.push({ id: investorRef.id, ...investor });
    }

    await batch.commit();

    res.status(201).json({
      success: true,
      message: `CSV uploaded successfully! ${records.length} records inserted.`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to upload CSV",
      details: error.message,
    });
  }
};

exports.getAllInvestors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Get investors from Firebase
    const investorsRef = db.collection('investors');
    const snapshot = await investorsRef.orderBy('createdAt', 'desc').get();
    
    const allInvestors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalCount = allInvestors.length;
    const investors = allInvestors.slice(skip, skip + parsedLimit);

    const formattedInvestors = investors.map((investor) => ({
      ...investor,
      fund_stage: Array.isArray(investor.fund_stage)
        ? investor.fund_stage.join(", ")
        : investor.fund_stage,
      sector_focus: Array.isArray(investor.sector_focus)
        ? investor.sector_focus.join(", ")
        : investor.sector_focus,
      portfolio_companies: Array.isArray(investor.portfolio_companies)
        ? investor.portfolio_companies.join(", ")
        : investor.portfolio_companies,
    }));

    res.status(200).json({
      message: "Successfully retrieved investors",
      totalCount,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalCount / parsedLimit),
      data: formattedInvestors,
    });
  } catch (error) {
    console.error("Error retrieving investors:", error);
    res.status(500).json({
      error: "Failed to retrieve investors",
      details: error.message,
    });
  }
};

exports.updateInvestor = async (req, res) => {
  try {
    const investorId = req.params.id;
    const updateData = req.body;

    if (!investorId) {
      return res.status(400).json({ error: "Investor ID is required" });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Update data is required" });
    }

    const normalizedData = transformFrontendToDB
      ? transformFrontendToDB(updateData)
      : updateData;

    const investorRef = db.collection('investors').doc(investorId);
    const investorDoc = await investorRef.get();
    
    if (!investorDoc.exists) {
      return res.status(404).json({ error: "Investor not found" });
    }

    await investorRef.update({
      ...normalizedData,
      updatedAt: new Date(),
    });

    // Trigger Excel sync
    const excelService = require('../services/excel.service');
    setTimeout(() => {
      excelService.syncFirebaseToExcel();
    }, 1000);

    res.status(200).json({
      message: `Investor ${investorId} updated successfully`,
      updatedFields: Object.keys(normalizedData),
    });
  } catch (error) {
    console.error("Update error:", error);
    res
      .status(500)
      .json({ error: "Failed to update investor", details: error.message });
  }
};

exports.deleteInvestor = async (req, res) => {
  try {
    const investorId = req.params.id;

    if (!investorId) {
      return res.status(400).json({ error: "Investor ID is required" });
    }

    const investorRef = db.collection('investors').doc(investorId);
    const investorDoc = await investorRef.get();
    
    if (!investorDoc.exists) {
      return res.status(404).json({ error: "Investor not found" });
    }

    await investorRef.delete();

    // Trigger Excel sync
    const excelService = require('../services/excel.service');
    setTimeout(() => {
      excelService.syncFirebaseToExcel();
    }, 1000);

    res.status(200).json({
      message: `Successfully deleted investor with ID: ${investorId}`,
    });
  } catch (error) {
    console.error("Error deleting investor:", error);
    res.status(500).json({
      error: "Failed to delete investor",
      details: error.message,
    });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    // Get all investors from Firebase
    const investorsRef = db.collection('investors');
    const snapshot = await investorsRef.get();
    const investors = snapshot.docs.map(doc => doc.data());

    // Process filter options in memory
    const fund_stage = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.fund_stage) ? inv.fund_stage : [inv.fund_stage]
    ).filter(Boolean).map(s => s.toLowerCase()))].sort();

    const fund_type = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.fund_type) ? inv.fund_type : [inv.fund_type]
    ).filter(Boolean).map(t => t.toLowerCase()))].sort();

    const sector_focus = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.sector_focus) ? inv.sector_focus : [inv.sector_focus]
    ).filter(Boolean).map(s => s.toLowerCase()))].sort();

    const result = {
      fund_stage: fund_stage.map(s => ({ _id: s })),
      fund_type: fund_type.map(t => ({ _id: t })),
      sector_focus: sector_focus.map(s => ({ _id: s })),
    };

    const format = (arr) => arr.map((item) => item._id);

    res.status(200).json({
      fund_stage: format(result[0].fund_stage),
      fund_type: format(result[0].fund_type),
      sector_focus: format(result[0].sector_focus),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve filter options",
      details: err.message,
    });
  }
};

exports.getUniqueFundSectors = async (req, res) => {
  try {
    const result = await Investor.aggregate([
      {
        $project: {
          sector_focus: 1,
        },
      },
      {
        $unwind: "$sector_focus",
      },
      {
        $group: {
          _id: { $toLower: "$sector_focus" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const sector_focus = result.map((item) => item._id);

    res.status(200).json({
      sector_focus,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve sector_focus options",
      details: err.message,
    });
  }
};

exports.getUniqueFundTypes = async (req, res) => {
  try {
    const result = await Investor.aggregate([
      {
        $project: {
          fund_type: 1,
        },
      },
      {
        $group: {
          _id: { $toLower: "$fund_type" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const fund_type = result.map((item) => item._id);

    res.status(200).json({
      fund_type,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve fund_type options",
      details: err.message,
    });
  }
};
