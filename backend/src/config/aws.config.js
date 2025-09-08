// awsClients.js
const { SESClient } = require("@aws-sdk/client-ses");
const { SNSClient } = require("@aws-sdk/client-sns");
const { ensureCorrectFormat } = require('../utils/aws-helpers');

// Ensure credentials are strings
const credentials = {
  accessKeyId: ensureCorrectFormat(process.env.AWS_ACCESS_KEY_ID),
  secretAccessKey: ensureCorrectFormat(process.env.AWS_SECRET_ACCESS_KEY),
};

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials,
});

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials,
});

module.exports = { sesClient, snsClient, ensureCorrectFormat };