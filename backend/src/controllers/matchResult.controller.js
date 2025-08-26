const Investor = require("../models/investor.model");
const Company = require("../models/company.model");
const MatchResult = require("../models/matchResult.model");

exports.getAllMatchResults = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await MatchResult.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const results = await MatchResult.find()
      .populate("company", "company_name email city state industry fund_stage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const formatted = results.map((item) => ({
      id: item._id,
      company: item.company,
      totalMatches: item.results.length,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching match results:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getScoredInvestors = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Normalize company fields for matching
    const companySectors = [company.industry?.toLowerCase()];
    const companyFundStage = company.fund_stage?.toLowerCase();
    const companyCity = company.city?.toLowerCase();
    const companyState = company.state?.toLowerCase();

    // Basic match to reduce dataset (~3000)
    const investors = await Investor.find({
      $or: [
        { sector_focus: { $in: companySectors } },
        { fund_stage: companyFundStage },
        { location: { $regex: companyCity, $options: "i" } },
        { location: { $regex: companyState, $options: "i" } },
      ],
    });

    const scoredResults = investors.map((inv) => {
      let score = 0;

      // Sector match (max 30)
      const sectorMatch = inv.sector_focus.map((s) => s.toLowerCase());
      if (companySectors.some((sec) => sectorMatch.includes(sec))) {
        score += 30;
      }

      // Fund stage match (max 30)
      const fundMatch = inv.fund_stage.map((s) => s.toLowerCase());
      if (fundMatch.includes(companyFundStage)) {
        score += 30;
      }

      // Geography match (city: 20, state: 10)
      if (inv.location?.toLowerCase().includes(companyCity)) {
        score += 20;
      } else if (inv.location?.toLowerCase().includes(companyState)) {
        score += 10;
      }

      return {
        score,
        partner_name: inv.partner_name,
        partner_email: inv.partner_email,
        investor_name: inv.investor_name,
      };
    });

    // Sort by score descending
    const sorted = scoredResults.sort((a, b) => b.score - a.score);

    await MatchResult.findOneAndUpdate(
      { company: companyId },
      { results: sorted },
      { upsert: true, new: true }
    );

    res.json(sorted);
  } catch (err) {
    console.error("Error in scoring investors:", err);
    res.status(500).json({ error: err.message });
  }
};
