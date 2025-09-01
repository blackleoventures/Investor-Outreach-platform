const { db } = require("../config/firebase");

exports.getAllMatchResults = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Get match results from Firebase
    const matchResultsRef = db.collection('matchResults');
    const snapshot = await matchResultsRef.orderBy('createdAt', 'desc').get();
    
    const allResults = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const total = allResults.length;
    const totalPages = Math.ceil(total / limit);
    const results = allResults.slice((page - 1) * limit, page * limit);

    const formatted = results.map((item) => ({
      id: item.id,
      company: item.company,
      totalMatches: item.results ? item.results.length : 0,
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
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company = companyDoc.data();

    // Normalize company fields for matching
    const companySectors = [company.industry?.toLowerCase()];
    const companyFundStage = company.fund_stage?.toLowerCase();
    const companyCity = company.city?.toLowerCase();
    const companyState = company.state?.toLowerCase();

    // Get all investors from Firebase and filter in memory
    const investorsRef = db.collection('investors');
    const investorsSnapshot = await investorsRef.get();
    const allInvestors = investorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Basic match to reduce dataset
    const investors = allInvestors.filter(inv => {
      const sectorMatch = inv.sector_focus && companySectors.some(sec => 
        inv.sector_focus.includes(sec)
      );
      const fundMatch = inv.fund_stage && inv.fund_stage.includes(companyFundStage);
      const cityMatch = inv.location && inv.location.toLowerCase().includes(companyCity);
      const stateMatch = inv.location && inv.location.toLowerCase().includes(companyState);
      
      return sectorMatch || fundMatch || cityMatch || stateMatch;
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

    // Update or create match result in Firebase
    const matchResultRef = db.collection('matchResults').doc();
    await matchResultRef.set({
      company: companyId,
      results: sorted,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Remove the old MongoDB-specific code

    res.json(sorted);
  } catch (err) {
    console.error("Error in scoring investors:", err);
    res.status(500).json({ error: err.message });
  }
};
