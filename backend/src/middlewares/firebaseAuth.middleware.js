const admin = require("../config/firebase.config");

const verifyFirebaseToken = async (req, res, next) => {
  // Development bypass - remove this in production
  if (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') {
    console.log('🔓 Auth bypassed for development');
    req.user = { uid: 'dev-user', email: 'dev@example.com' };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ Missing or invalid authorization header');
    return res.status(401).json({ error: 'Unauthorized - Missing token' });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    console.log('✅ Token verified for user:', decodedToken.email);
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

module.exports = verifyFirebaseToken;
