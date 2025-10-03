// Simple test for template generation
const express = require('express');
const app = express();
app.use(express.json());

app.post('/test-template', (req, res) => {
  const data = {
    companyName: 'Cosmedream',
    founderName: 'Parikshit Sethi',
    sector: 'FMCG',
    fundingAmount: '$2M',
    investorName: req.body.investorName || 'John Investor'
  };

  const subject = `Investment – ${data.companyName}`;
  const body = `Dear ${data.investorName},

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${data.companyName}, an ${data.sector} brand.

We're currently raising ${data.fundingAmount} for expansion and marketing.

Looking forward to hearing from you.

Warm regards,
${data.founderName}
Investor Relations – ${data.companyName}`;

  res.json({
    success: true,
    data: {
      emailTemplate: { subject, body },
      extractedData: data
    }
  });
});

app.listen(5001, () => console.log('Test server on port 5001'));