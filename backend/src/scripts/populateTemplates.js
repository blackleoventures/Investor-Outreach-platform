const { dbHelpers } = require("../config/firebase-db.config");

const templates = [
  {
    subject: "Investment Opportunity - [Company Name]",
    body: `Hi [Investor Name],

I hope this email finds you well. I'm [Your Name], [Your Title] at [Company Name].

We're solving [Problem] in the [Industry] space with our innovative [Solution]. Our traction includes [Key Metrics] and we're seeing strong market validation.

We're currently raising [Amount] to [Use of Funds]. Given your focus on [Relevant Sector], I believe this opportunity aligns well with your investment thesis.

Would you be open to a brief call to discuss this opportunity?

Best regards,
[Your Name]
[Contact Information]`
  },
  {
    subject: "Partnership Opportunity - [Company Name]",
    body: `Dear [Investor Name],

I'm reaching out to introduce [Company Name], where we're revolutionizing [Industry] through [Technology/Approach].

Key highlights:
• Market Size: $[TAM]B TAM with [Growth Rate]% CAGR
• Traction: [Users/Revenue/Partnerships]
• Team: [Team Background]
• Competitive Advantage: [Unique Value Prop]

We're raising [Amount] at a [Valuation] valuation. This round is [Percentage]% subscribed with participation from [Notable Investors].

I'd love to share our pitch deck and discuss how [Company Name] could be a valuable addition to your portfolio.

Best,
[Your Name]`
  },
  {
    subject: "Seed Round - [Company Name] Solving [Problem]",
    body: `Hi [Investor Name],

Quick intro: I'm [Your Name], founder of [Company Name]. We're addressing the $[Market Size] problem of [Problem Description].

Our solution: [Brief Solution Description]

Early traction:
- [Metric 1]
- [Metric 2] 
- [Metric 3]

We're raising our seed round of [Amount] to [Primary Use of Funds]. The round is moving quickly with strong investor interest.

Would you be interested in learning more? Happy to send over our deck.

Thanks,
[Your Name]`
  }
];

async function populateTemplates() {
  try {
    console.log("Starting template population...");
    
    for (const template of templates) {
      const doc = await dbHelpers.create("email_templates", template);
      console.log(`Created template: ${template.subject} (ID: ${doc.id})`);
    }
    
    console.log("Template population completed successfully!");
  } catch (error) {
    console.error("Error populating templates:", error);
  }
}

// Run if called directly
if (require.main === module) {
  populateTemplates();
}

module.exports = { populateTemplates };