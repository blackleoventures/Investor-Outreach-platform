// Test data for real-time updates simulation
export const generateTestReportData = () => {
  const testInvestors = [
    {
      id: '1',
      firmName: 'Sequoia Capital',
      contactPerson: 'Roelof Botha',
      email: 'roelof@sequoiacap.com',
      status: 'delivered' as const,
      opened: Math.random() > 0.3,
      openedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
      clicked: Math.random() > 0.7,
      replied: Math.random() > 0.8,
      repliedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString() : undefined,
      sector: 'Technology',
      location: 'Menlo Park, CA'
    },
    {
      id: '2', 
      firmName: 'Andreessen Horowitz',
      contactPerson: 'Marc Andreessen',
      email: 'marc@a16z.com',
      status: 'delivered' as const,
      opened: Math.random() > 0.3,
      openedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
      clicked: Math.random() > 0.7,
      replied: Math.random() > 0.8,
      repliedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString() : undefined,
      sector: 'Software',
      location: 'Menlo Park, CA'
    },
    {
      id: '3',
      firmName: 'Kleiner Perkins',
      contactPerson: 'John Doerr',
      email: 'john@kpcb.com',
      status: 'delivered' as const,
      opened: Math.random() > 0.3,
      openedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
      clicked: Math.random() > 0.7,
      replied: Math.random() > 0.8,
      repliedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString() : undefined,
      sector: 'CleanTech',
      location: 'Menlo Park, CA'
    },
    {
      id: '4',
      firmName: 'Accel Partners',
      contactPerson: 'Jim Breyer',
      email: 'jim@accel.com',
      status: 'delivered' as const,
      opened: Math.random() > 0.3,
      openedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
      clicked: Math.random() > 0.7,
      replied: Math.random() > 0.8,
      repliedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString() : undefined,
      sector: 'Social Media',
      location: 'Palo Alto, CA'
    },
    {
      id: '5',
      firmName: 'Benchmark Capital',
      contactPerson: 'Bill Gurley',
      email: 'bill@benchmark.com',
      status: 'delivered' as const,
      opened: Math.random() > 0.3,
      openedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
      clicked: Math.random() > 0.7,
      replied: Math.random() > 0.8,
      repliedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString() : undefined,
      sector: 'E-commerce',
      location: 'Menlo Park, CA'
    }
  ];

  return {
    id: 'test-campaign',
    name: 'Q4 2024 Investor Outreach',
    clientName: 'TechStartup Inc',
    type: 'Email Campaign',
    createdAt: new Date().toISOString(),
    status: 'completed',
    metrics: {
      sent: testInvestors.length,
      delivered: testInvestors.length,
      failed: 0,
      opened: testInvestors.filter(i => i.opened).length,
      clicked: testInvestors.filter(i => i.clicked).length,
      replied: testInvestors.filter(i => i.replied).length,
      openRate: (testInvestors.filter(i => i.opened).length / testInvestors.length) * 100,
      clickRate: (testInvestors.filter(i => i.clicked).length / testInvestors.length) * 100,
      responseRate: (testInvestors.filter(i => i.replied).length / testInvestors.length) * 100,
    },
    recipients: testInvestors
  };
};