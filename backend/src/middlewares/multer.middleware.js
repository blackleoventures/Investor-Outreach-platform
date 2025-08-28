const multer = require("multer");
const os = require("os");

// Use system temp directory for cross-platform safety (Windows/Linux/macOS)
const upload = multer({ dest: os.tmpdir() });

module.exports = upload;
