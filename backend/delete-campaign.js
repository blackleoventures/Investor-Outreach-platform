const { dbHelpers } = require('./src/config/firebase-db.config');

async function deleteCampaign() {
  try {
    console.log('Fetching all campaigns...');
    const campaigns = await dbHelpers.getAll('emailCampaigns');
    
    console.log(`\nFound ${campaigns.length} campaigns:`);
    campaigns.forEach((campaign, index) => {
      console.log(`${index + 1}. ID: ${campaign.id}`);
      console.log(`   Name: ${campaign.campaignName || 'N/A'}`);
      console.log(`   Client: ${campaign.clientName || 'N/A'}`);
      console.log(`   Recipients: ${campaign.recipients ? campaign.recipients.length : 0}`);
      console.log(`   Sent: ${campaign.sentAt || 'N/A'}`);
      console.log('');
    });
    
    // Look for the specific campaign
    const targetCampaign = campaigns.find(c => 
      c.campaignName && 
      (c.campaignName.includes('2024 Investor Outreach') || c.campaignName.includes('Investor Outlook'))
    );
    
    if (targetCampaign) {
      console.log(`\nFound target campaign to delete:`);
      console.log(`ID: ${targetCampaign.id}`);
      console.log(`Name: ${targetCampaign.campaignName}`);
      console.log(`Client: ${targetCampaign.clientName}`);
      console.log(`Recipients: ${targetCampaign.recipients ? targetCampaign.recipients.length : 0}`);
      
      // Delete the campaign
      console.log(`\nDeleting campaign...`);
      await dbHelpers.delete('emailCampaigns', targetCampaign.id);
      console.log('✅ Campaign deleted successfully!');
      
    } else {
      console.log('\n❌ Target campaign not found. Available campaigns listed above.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteCampaign();
