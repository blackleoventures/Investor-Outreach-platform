const { db } = require("../config/firebase");

const preBuiltTemplates = [
  {
    name: "Initial Outreach - Problem Solver",
    category: "Initial Outreach",
    subject: "Investment Opportunity: [Startup Name] Solving [Core Problem] in [Market]",
    body: `Hi [Investor Name],

I hope this email finds you well. I'm reaching out because I believe [Startup Name] aligns perfectly with your investment thesis in [Sector].

**The Problem We're Solving:**
[Core Problem Description] - This is a [Market Size] market opportunity affecting [Target Audience].

**Our Solution:**
[Solution Description] - We've developed a [Technology/Approach] that [Key Benefit].

**Why This Matters:**
- Market Size: [TAM/SAM/SOM]
- Current Traction: [Revenue/Users/Growth Metrics]
- Team: [Key Team Members & Experience]

**Investment Ask:**
We're raising [Amount] at [Valuation] to [Use of Funds].

I'd love to share our pitch deck and discuss how we can work together. Would you be open to a 15-minute call next week?

Best regards,
[Founder Name]
[Title]
[Company Name]
[Contact Info]`,
    variables: [
      { name: "Investor Name", description: "Investor's first name", defaultValue: "[Investor Name]", required: true },
      { name: "Startup Name", description: "Your company name", defaultValue: "[Startup Name]", required: true },
      { name: "Core Problem", description: "Main problem you're solving", defaultValue: "[Core Problem]", required: true },
      { name: "Market", description: "Target market/industry", defaultValue: "[Market]", required: true },
      { name: "Sector", description: "Business sector", defaultValue: "[Sector]", required: true },
      { name: "Market Size", description: "Market size (e.g., $10B)", defaultValue: "[Market Size]", required: true },
      { name: "Target Audience", description: "Who has this problem", defaultValue: "[Target Audience]", required: true },
      { name: "Solution Description", description: "How you solve the problem", defaultValue: "[Solution Description]", required: true },
      { name: "Technology/Approach", description: "Your unique approach", defaultValue: "[Technology/Approach]", required: true },
      { name: "Key Benefit", description: "Main benefit of your solution", defaultValue: "[Key Benefit]", required: true },
      { name: "TAM/SAM/SOM", description: "Market size breakdown", defaultValue: "[TAM/SAM/SOM]", required: true },
      { name: "Revenue/Users/Growth Metrics", description: "Current traction", defaultValue: "[Revenue/Users/Growth Metrics]", required: true },
      { name: "Key Team Members & Experience", description: "Team highlights", defaultValue: "[Key Team Members & Experience]", required: true },
      { name: "Amount", description: "Funding amount", defaultValue: "[Amount]", required: true },
      { name: "Valuation", description: "Company valuation", defaultValue: "[Valuation]", required: true },
      { name: "Use of Funds", description: "How you'll use the money", defaultValue: "[Use of Funds]", required: true },
      { name: "Founder Name", description: "Your name", defaultValue: "[Founder Name]", required: true },
      { name: "Title", description: "Your title", defaultValue: "[Title]", required: true },
      { name: "Company Name", description: "Company name", defaultValue: "[Company Name]", required: true },
      { name: "Contact Info", description: "Your contact information", defaultValue: "[Contact Info]", required: true },
    ],
    tone: "Professional",
    isPreBuilt: true,
    tags: ["outreach", "problem-solution", "professional"],
  },
  {
    name: "Follow-up - Value Add",
    category: "Follow-up",
    subject: "Following up: [Startup Name] - Quick question about [Specific Topic]",
    body: `Hi [Investor Name],

I wanted to follow up on my previous email about [Startup Name]. I understand you're busy, so I'll keep this brief.

**Quick Question:**
[Specific Question or Insight]

**Why This Matters for You:**
[Specific Value Proposition for This Investor]

**Next Steps:**
- [Option 1: Quick call]
- [Option 2: Send more info]
- [Option 3: Connect with portfolio company]

If you're not interested, no worries at all. But if you'd like to learn more, I'm happy to share our latest metrics or connect you with our existing investors.

Best regards,
[Founder Name]`,
    variables: [
      { name: "Investor Name", description: "Investor's first name", defaultValue: "[Investor Name]", required: true },
      { name: "Startup Name", description: "Your company name", defaultValue: "[Startup Name]", required: true },
      { name: "Specific Topic", description: "What you're following up about", defaultValue: "[Specific Topic]", required: true },
      { name: "Specific Question or Insight", description: "Your follow-up question", defaultValue: "[Specific Question or Insight]", required: true },
      { name: "Specific Value Proposition for This Investor", description: "Why this matters to them", defaultValue: "[Specific Value Proposition for This Investor]", required: true },
      { name: "Option 1: Quick call", description: "First option", defaultValue: "15-minute call to discuss [Topic]", required: false },
      { name: "Option 2: Send more info", description: "Second option", defaultValue: "Send our latest deck and metrics", required: false },
      { name: "Option 3: Connect with portfolio company", description: "Third option", defaultValue: "Connect you with [Portfolio Company]", required: false },
      { name: "Founder Name", description: "Your name", defaultValue: "[Founder Name]", required: true },
    ],
    tone: "Friendly",
    isPreBuilt: true,
    tags: ["follow-up", "value-add", "friendly"],
  },
  {
    name: "Thank You - Meeting Follow-up",
    category: "Thank You",
    subject: "Thank you for your time - [Startup Name]",
    body: `Hi [Investor Name],

Thank you for taking the time to meet with me yesterday to discuss [Startup Name]. I really enjoyed our conversation about [Key Topics Discussed].

**Key Takeaways from Our Discussion:**
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]

**Next Steps:**
As discussed, I'll [Specific Action Items] and follow up by [Timeline].

**Additional Resources:**
I've attached [Additional Materials] that we discussed during our meeting.

Please let me know if you need anything else or have any questions. I'm excited about the potential to work together!

Best regards,
[Founder Name]`,
    variables: [
      { name: "Investor Name", description: "Investor's first name", defaultValue: "[Investor Name]", required: true },
      { name: "Startup Name", description: "Your company name", defaultValue: "[Startup Name]", required: true },
      { name: "Key Topics Discussed", description: "Main topics from meeting", defaultValue: "[Key Topics Discussed]", required: true },
      { name: "Takeaway 1", description: "First key takeaway", defaultValue: "[Takeaway 1]", required: true },
      { name: "Takeaway 2", description: "Second key takeaway", defaultValue: "[Takeaway 2]", required: true },
      { name: "Takeaway 3", description: "Third key takeaway", defaultValue: "[Takeaway 3]", required: true },
      { name: "Specific Action Items", description: "What you'll do next", defaultValue: "[Specific Action Items]", required: true },
      { name: "Timeline", description: "When you'll follow up", defaultValue: "[Timeline]", required: true },
      { name: "Additional Materials", description: "What you're sending", defaultValue: "[Additional Materials]", required: true },
      { name: "Founder Name", description: "Your name", defaultValue: "[Founder Name]", required: true },
    ],
    tone: "Professional",
    isPreBuilt: true,
    tags: ["thank-you", "meeting", "professional"],
  },
  {
    name: "Investor Update - Milestone Reached",
    category: "Investor Update",
    subject: "Update: [Startup Name] - [Milestone] Achieved!",
    body: `Hi [Investor Name],

I hope you're doing well! I wanted to share some exciting news about [Startup Name].

**🎉 Major Milestone Achieved:**
[Milestone Description]

**📊 Key Metrics Update:**
- Revenue: [Current Revenue] (vs [Previous Revenue])
- Users: [Current Users] (vs [Previous Users])
- Growth: [Growth Rate]

**🚀 What This Means:**
[Impact and Significance]

**📈 Next Milestones:**
- [Milestone 1] - Target: [Timeline]
- [Milestone 2] - Target: [Timeline]

**💰 Funding Status:**
We're currently [Funding Status] and [Next Steps].

I'd love to catch up and discuss how this milestone impacts our growth trajectory. Are you available for a quick call next week?

Best regards,
[Founder Name]`,
    variables: [
      { name: "Investor Name", description: "Investor's first name", defaultValue: "[Investor Name]", required: true },
      { name: "Startup Name", description: "Your company name", defaultValue: "[Startup Name]", required: true },
      { name: "Milestone", description: "What milestone was achieved", defaultValue: "[Milestone]", required: true },
      { name: "Milestone Description", description: "Details about the milestone", defaultValue: "[Milestone Description]", required: true },
      { name: "Current Revenue", description: "Current revenue figure", defaultValue: "[Current Revenue]", required: true },
      { name: "Previous Revenue", description: "Previous revenue figure", defaultValue: "[Previous Revenue]", required: true },
      { name: "Current Users", description: "Current user count", defaultValue: "[Current Users]", required: true },
      { name: "Previous Users", description: "Previous user count", defaultValue: "[Previous Users]", required: true },
      { name: "Growth Rate", description: "Growth percentage", defaultValue: "[Growth Rate]", required: true },
      { name: "Impact and Significance", description: "Why this milestone matters", defaultValue: "[Impact and Significance]", required: true },
      { name: "Milestone 1", description: "Next milestone", defaultValue: "[Milestone 1]", required: true },
      { name: "Timeline", description: "Target timeline", defaultValue: "[Timeline]", required: true },
      { name: "Milestone 2", description: "Second milestone", defaultValue: "[Milestone 2]", required: true },
      { name: "Funding Status", description: "Current funding status", defaultValue: "[Funding Status]", required: true },
      { name: "Next Steps", description: "What's next", defaultValue: "[Next Steps]", required: true },
      { name: "Founder Name", description: "Your name", defaultValue: "[Founder Name]", required: true },
    ],
    tone: "Persuasive",
    isPreBuilt: true,
    tags: ["update", "milestone", "persuasive"],
  },
];

async function populateTemplates() {
  try {
    console.log("Starting template population...");
    
    // Clear existing pre-built templates
    const templatesRef = db.collection('emailTemplates');
    const snapshot = await templatesRef.where('isPreBuilt', '==', true).get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("Cleared existing pre-built templates");
    
    // Insert new templates
    const results = [];
    for (const template of preBuiltTemplates) {
      const templateRef = templatesRef.doc();
      await templateRef.set({
        ...template,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      results.push({ id: templateRef.id, ...template });
    }
    
    console.log(`Successfully inserted ${results.length} pre-built templates`);
    
    // Log template names
    results.forEach(template => {
      console.log(`- ${template.name} (${template.category})`);
    });
    
    console.log("Template population completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error populating templates:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateTemplates();
}

module.exports = { populateTemplates, preBuiltTemplates }; 