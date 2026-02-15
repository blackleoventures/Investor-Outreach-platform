import { adminDb } from "../lib/firebase-admin";

async function seedFailedRecipients() {
  const campaignId = "test-campaign-relay-check";

  // 1. Relay Error (Should show as AUTH_FAILED)
  await adminDb.collection("campaignRecipients").add({
    campaignId,
    status: "failed",
    originalContact: {
      email: "relay@test.com",
      name: "Relay Tester",
      organization: "Test Org",
    },
    // Simulate legacy data with no errorType but relay message
    lastError: {
      message: "550 5.7.1 Relay denied for <relay@test.com>",
      code: "EENVELOPE",
    },
    failureReason: "Relay denied",
    retryCount: 0,
    canRetry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledFor: new Date().toISOString(),
  });

  // 2. Fatal Error (Invalid Email)
  await adminDb.collection("campaignRecipients").add({
    campaignId,
    status: "failed",
    originalContact: {
      email: "invalid@test.com",
      name: "Invalid Tester",
    },
    lastError: {
      errorType: "INVALID_EMAIL",
      errorMessage: "Email address does not exist",
    },
    retryCount: 0,
    canRetry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 3. Retryable Error
  await adminDb.collection("campaignRecipients").add({
    campaignId,
    status: "failed",
    originalContact: {
      email: "timeout@test.com",
      name: "Timeout Tester",
    },
    lastError: {
      errorType: "CONNECTION_TIMEOUT",
      errorMessage: "Connection timed out",
    },
    retryCount: 1,
    canRetry: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log("Seeded failed recipients for campaign:", campaignId);
}

seedFailedRecipients().catch(console.error);
