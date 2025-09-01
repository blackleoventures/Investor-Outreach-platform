// Transform frontend data to database format
function transformFrontendToDB(data) {
  if (Array.isArray(data)) {
    return data.map(item => transformFrontendToDB(item));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const transformed = {};

  // Handle fund_stage
  if (data.fund_stage) {
    transformed.fund_stage = Array.isArray(data.fund_stage) 
      ? data.fund_stage 
      : data.fund_stage.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Handle fund_type
  if (data.fund_type) {
    transformed.fund_type = Array.isArray(data.fund_type) 
      ? data.fund_type 
      : data.fund_type.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Handle sector_focus
  if (data.sector_focus) {
    transformed.sector_focus = Array.isArray(data.sector_focus) 
      ? data.sector_focus 
      : data.sector_focus.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Handle portfolio_companies
  if (data.portfolio_companies) {
    transformed.portfolio_companies = Array.isArray(data.portfolio_companies) 
      ? data.portfolio_companies 
      : data.portfolio_companies.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Copy other fields
  Object.keys(data).forEach(key => {
    if (!['fund_stage', 'fund_type', 'sector_focus', 'portfolio_companies'].includes(key)) {
      transformed[key] = data[key];
    }
  });

  return transformed;
}

// Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize string
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

module.exports = {
  transformFrontendToDB,
  generateSessionId,
  formatDate,
  isValidEmail,
  sanitizeString,
}; 