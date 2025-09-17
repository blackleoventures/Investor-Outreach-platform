const admin = require("../config/firebase.config");

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('No auth header provided, allowing request for development');
    // For development, allow requests without auth
    req.user = { uid: 'dev-user', email: 'dev@example.com' };
    return next();
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    // For development, allow requests even with invalid tokens
    req.user = { uid: 'dev-user', email: 'dev@example.com' };
    next();
  }
};

module.exports = verifyFirebaseToken;
