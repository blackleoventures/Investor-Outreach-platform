import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import {
  getInvestorsFromSheet,
  getIncubatorsFromSheet,
} from "@/lib/google-sheets";

// Scoring algorithm
function calculateMatchScore(
  client: any,
  contact: any,
  contactType: "investor" | "incubator"
): { score: number; matchedCriteria: string[] } {
  let score = 0;
  const matchedCriteria: string[] = [];

  // 1. Funding Stage Match (30 points)
  const clientStage = client.fundingStage.toLowerCase();
  const contactStages =
    contact.investmentStages || contact.acceptedStages || [];

  if (contactStages.some((s: string) => s.toLowerCase() === clientStage)) {
    score += 30;
    matchedCriteria.push("Stage");
  } else {
    // Check adjacent stages
    const stageOrder = [
      "pre-seed",
      "seed",
      "series a",
      "series b",
      "series c",
      "growth",
    ];
    const clientStageIndex = stageOrder.findIndex((s) =>
      clientStage.includes(s)
    );

    if (
      clientStageIndex > 0 &&
      contactStages.some((s: string) =>
        s.toLowerCase().includes(stageOrder[clientStageIndex - 1])
      )
    ) {
      score += 15;
      matchedCriteria.push("Adjacent Stage");
    } else if (
      clientStageIndex < stageOrder.length - 1 &&
      contactStages.some((s: string) =>
        s.toLowerCase().includes(stageOrder[clientStageIndex + 1])
      )
    ) {
      score += 15;
      matchedCriteria.push("Adjacent Stage");
    }
  }

  // 2. Sector Match (40 points)
  const clientIndustry = client.industry.toLowerCase();
  const contactSectors = contact.sectorFocus || [];

  if (
    contactSectors.some(
      (s: string) =>
        s.toLowerCase().includes(clientIndustry) ||
        clientIndustry.includes(s.toLowerCase())
    )
  ) {
    score += 40;
    matchedCriteria.push("Sector");
  } else {
    // Check related sectors
    const relatedSectors: Record<string, string[]> = {
      ai: [
        "artificial intelligence",
        "machine learning",
        "data analytics",
        "saas",
        "technology",
      ],
      fintech: ["financial services", "banking", "payments", "finance"],
      healthtech: ["healthcare", "biotech", "medical", "health"],
      saas: ["software", "enterprise", "b2b", "technology"],
      ecommerce: ["retail", "consumer", "marketplace", "commerce"],
      edtech: ["education", "learning", "training"],
    };

    for (const [key, related] of Object.entries(relatedSectors)) {
      if (clientIndustry.includes(key)) {
        if (
          contactSectors.some((s: string) =>
            related.some((r) => s.toLowerCase().includes(r))
          )
        ) {
          score += 20;
          matchedCriteria.push("Related Sector");
          break;
        }
      }
    }
  }

  // 3. Location Match (20 points)
  const clientLocation = client.city.toLowerCase();
  const contactLocations = contact.locations || [];

  // Extract country from client location (last part after comma)
  const clientCountry =
    clientLocation.split(",").pop()?.trim().toLowerCase() || "";

  if (
    contactLocations.some((l: string) =>
      l.toLowerCase().includes(clientCountry)
    )
  ) {
    score += 20;
    matchedCriteria.push("Location");
  } else {
    // Check regional match
    const regions: Record<string, string[]> = {
      asia: [
        "india",
        "singapore",
        "china",
        "japan",
        "korea",
        "malaysia",
        "thailand",
        "vietnam",
        "indonesia",
      ],
      "north america": ["usa", "united states", "us", "canada", "america"],
      europe: [
        "uk",
        "united kingdom",
        "germany",
        "france",
        "spain",
        "italy",
        "netherlands",
        "sweden",
      ],
      "middle east": ["uae", "dubai", "saudi arabia", "israel", "qatar"],
    };

    for (const [region, countries] of Object.entries(regions)) {
      if (countries.some((c) => clientCountry.includes(c))) {
        if (
          contactLocations.some((l: string) =>
            countries.some((country) => l.toLowerCase().includes(country))
          )
        ) {
          score += 10;
          matchedCriteria.push("Region");
          break;
        }
      }
    }
  }

  // 4. Investment Size Match (10 points)
  const clientInvestmentAsk = parseInvestmentAmount(client.investment);
  const contactTicketMin = contact.ticketSizeMin
    ? parseInvestmentAmount(contact.ticketSizeMin)
    : 0;
  const contactTicketMax = contact.ticketSizeMax
    ? parseInvestmentAmount(contact.ticketSizeMax)
    : Infinity;

  if (
    clientInvestmentAsk >= contactTicketMin &&
    clientInvestmentAsk <= contactTicketMax
  ) {
    score += 10;
    matchedCriteria.push("Ticket Size");
  } else {
    // Check if within 50% buffer
    const buffer = 0.5;
    if (
      clientInvestmentAsk >= contactTicketMin * (1 - buffer) &&
      clientInvestmentAsk <= contactTicketMax * (1 + buffer)
    ) {
      score += 5;
      matchedCriteria.push("Near Ticket Size");
    }
  }

  return { score, matchedCriteria };
}

function parseInvestmentAmount(amount: string): number {
  if (!amount) return 0;

  const numStr = amount.replace(/[^0-9.]/g, "");
  let num = parseFloat(numStr);

  if (isNaN(num)) return 0;

  if (
    amount.toLowerCase().includes("m") ||
    amount.toLowerCase().includes("million")
  ) {
    num *= 1000000;
  } else if (
    amount.toLowerCase().includes("k") ||
    amount.toLowerCase().includes("thousand")
  ) {
    num *= 1000;
  } else if (
    amount.toLowerCase().includes("b") ||
    amount.toLowerCase().includes("billion")
  ) {
    num *= 1000000000;
  }

  return num;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();
    const { clientId, targetType } = body;

    if (!clientId || !targetType) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch client details
    const clientDoc = await adminDb.collection("clients").doc(clientId).get();

    if (!clientDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 }
      );
    }

    const clientData = clientDoc.data();
    const clientInfo = clientData?.clientInformation;

    console.log(
      "[Match] Starting matching for client:",
      clientInfo.companyName
    );

    // Fetch investors and/or incubators from Google Sheets
    let allContacts: any[] = [];

    if (targetType === "investors" || targetType === "both") {
      console.log("[Match] Fetching investors from Google Sheets...");
      const investors = await getInvestorsFromSheet();
      console.log(`[Match] Found ${investors.length} investors`);
      allContacts.push(
        ...investors.map((inv: any) => ({ ...inv, type: "investor" }))
      );
    }

    if (targetType === "incubators" || targetType === "both") {
      console.log("[Match] Fetching incubators from Google Sheets...");
      const incubators = await getIncubatorsFromSheet();
      console.log(`[Match] Found ${incubators.length} incubators`);
      allContacts.push(
        ...incubators.map((inc: any) => ({ ...inc, type: "incubator" }))
      );
    }

    // Filter out contacts with missing emails
    allContacts = allContacts.filter(
      (c: any) => c.email && c.email.trim().length > 0
    );
    console.log(`[Match] After email filter: ${allContacts.length} contacts`);

    // TODO: Filter out contacts who received emails from this client in last 90 days
    // This requires querying campaign recipients collection
    // For now, we'll skip this check for MVP

    // Calculate scores for each contact
    console.log("[Match] Calculating match scores...");
    const scoredContacts = allContacts.map((contact: any) => {
      const { score, matchedCriteria } = calculateMatchScore(
        clientInfo,
        contact,
        contact.type
      );

      return {
        id: contact.id || `${contact.type}-${Math.random()}`,
        name: contact.partnerName || contact.name,
        email: contact.email,
        organization: contact.firm || contact.programName || contact.name,
        type: contact.type,
        matchScore: score,
        matchedCriteria,
        priority: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
        rawData: contact, // Store for later use in campaign activation
      };
    });

    // Filter by minimum score threshold (50)
    const filteredContacts = scoredContacts.filter((c) => c.matchScore >= 50);
    console.log(
      `[Match] After score filter (>=50): ${filteredContacts.length} contacts`
    );

    // Sort by score descending
    filteredContacts.sort((a, b) => b.matchScore - a.matchScore);

    // Calculate statistics
    const totalMatches = filteredContacts.length;
    const highPriority = filteredContacts.filter(
      (c) => c.priority === "high"
    ).length;
    const mediumPriority = filteredContacts.filter(
      (c) => c.priority === "medium"
    ).length;
    const lowPriority = filteredContacts.filter(
      (c) => c.priority === "low"
    ).length;
    const investorCount = filteredContacts.filter(
      (c) => c.type === "investor"
    ).length;
    const incubatorCount = filteredContacts.filter(
      (c) => c.type === "incubator"
    ).length;

    const response = {
      success: true,
      totalMatches,
      highPriority,
      highPriorityPercent:
        totalMatches > 0 ? Math.round((highPriority / totalMatches) * 100) : 0,
      mediumPriority,
      mediumPriorityPercent:
        totalMatches > 0
          ? Math.round((mediumPriority / totalMatches) * 100)
          : 0,
      lowPriority,
      lowPriorityPercent:
        totalMatches > 0 ? Math.round((lowPriority / totalMatches) * 100) : 0,
      investorCount,
      investorPercent:
        totalMatches > 0 ? Math.round((investorCount / totalMatches) * 100) : 0,
      incubatorCount,
      incubatorPercent:
        totalMatches > 0
          ? Math.round((incubatorCount / totalMatches) * 100)
          : 0,
      averageScore:
        totalMatches > 0
          ? Math.round(
              filteredContacts.reduce((sum, c) => sum + c.matchScore, 0) /
                totalMatches
            )
          : 0,
      matches: filteredContacts,
    };

    console.log("[Match] Matching complete:", {
      totalMatches,
      highPriority,
      mediumPriority,
      lowPriority,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Match Error]:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Matching algorithm failed",
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}
