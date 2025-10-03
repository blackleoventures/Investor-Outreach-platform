// Professional email templates for better inbox organization

function createProfessionalEmailTemplate(content, companyName = "Cosmedream") {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} - Investment Opportunity</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .header { padding: 15px !important; }
            .content { padding: 15px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <div class="container" style="max-width:600px;margin:0 auto;background-color:#ffffff;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div class="header" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:25px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:600;letter-spacing:-0.5px;">${companyName}</h1>
            <p style="margin:8px 0 0;color:#e2e8f0;font-size:14px;font-weight:400;">Investment Opportunity Platform</p>
        </div>
        
        <!-- Content -->
        <div class="content" style="padding:30px;">
            ${content}
        </div>
        
        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
                This email was sent by ${companyName} Investment Platform
            </p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">
                © 2024 ${companyName}. All rights reserved.
            </p>
        </div>
        
    </div>
</body>
</html>`;
}

function createInvestmentEmailContent(data) {
  const {
    investorName = "[Investor's Name]",
    companyName = "[Company Name]",
    sector = "FMCG",
    stage = "Series A",
    amount = "$2M",
    highlights = []
  } = data;

  return `
    <div style="margin-bottom:25px;">
        <h2 style="margin:0 0 15px;color:#1e293b;font-size:22px;font-weight:600;">Dear ${investorName},</h2>
        <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
            Hope you're doing well.
        </p>
    </div>

    <div style="background:#f0f9ff;padding:20px;border-radius:8px;border-left:4px solid #0ea5e9;margin-bottom:25px;">
        <h3 style="margin:0 0 15px;color:#0c4a6e;font-size:18px;">Investment Opportunity: ${companyName}</h3>
        <p style="margin:0 0 15px;color:#374151;font-size:16px;line-height:1.6;">
            I'm reaching out to share an exciting investment opportunity in ${companyName}, an ${sector} brand.
        </p>
    </div>

    <div style="margin-bottom:25px;">
        <h4 style="margin:0 0 15px;color:#1e293b;font-size:16px;font-weight:600;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Key Highlights:</h4>
        <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.8;">
            <li>Team: 40+ years of industry expertise</li>
            <li>Global Presence: Expanding to multiple countries</li>
            <li>IP: Proprietary formulations and technology</li>
            <li>Current Presence: Amazon, Website, Quick Commerce</li>
        </ul>
    </div>

    <div style="background:#fef3c7;padding:20px;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:25px;">
        <h4 style="margin:0 0 10px;color:#92400e;font-size:16px;">Currently raising ${amount} to accelerate marketing and expansion.</h4>
    </div>

    <div style="margin-bottom:25px;">
        <h4 style="margin:0 0 15px;color:#1e293b;font-size:16px;font-weight:600;">Funds will support:</h4>
        <div style="background:#ffffff;padding:15px;border-radius:6px;border:1px solid #e2e8f0;">
            <p style="margin:0 0 10px;color:#374151;">- Marketing and customer acquisition</p>
            <p style="margin:0 0 10px;color:#374151;">- Operations and technology enhancement</p>
            <p style="margin:0;color:#374151;">- Product development and R&D</p>
        </div>
    </div>

    <div style="background:#ecfdf5;padding:20px;border-radius:8px;border-left:4px solid #10b981;margin-bottom:25px;">
        <p style="margin:0;color:#065f46;font-size:16px;line-height:1.6;">
            If this aligns with your portfolio thesis in FMCG, we'd be glad to share the deck and set up a quick call with the founders.
        </p>
    </div>

    <div style="text-align:center;margin-top:30px;">
        <p style="margin:0;color:#374151;font-size:16px;font-weight:500;">
            Looking forward to hearing from you.
        </p>
        <p style="margin:15px 0 0;color:#6b7280;font-size:14px;">
            Warm regards.
        </p>
    </div>
  `;
}

module.exports = {
  createProfessionalEmailTemplate,
  createInvestmentEmailContent
};