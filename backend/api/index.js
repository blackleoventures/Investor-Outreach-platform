// Vercel Serverless Function entry to run the Express app
// Root Directory for this Vercel project should be set to "backend"

const app = require('../src/server');

module.exports = (req, res) => {
  return app(req, res);
};


