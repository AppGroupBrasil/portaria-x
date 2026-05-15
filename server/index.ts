import "dotenv/config";
import http from "node:http";
import { createApp } from "./app.js";
import { initArrivalWebSocket } from "./wsEstouChegando.js";
import { loadModels as loadFaceModels } from "./faceService.js";
import { performBackup, cleanupDemoAccounts, cleanupExpiredAuthorizations, cleanupOldAuditLogs } from "./db.js";
import { logger } from "./logger.js";

// JWT_SECRET validation happens at import time in ./jwtSecret.ts (via app.ts deps)

const PORT = Number.parseInt(process.env.PORT || "3001");

const app = await createApp();
const server = http.createServer(app);
initArrivalWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`\n  🚀 Portaria X running at http://0.0.0.0:${PORT}`);
  logger.info(`  📦 API: http://localhost:${PORT}/api\n`);

  loadFaceModels().then(() => {
    logger.info("  🧠 Face recognition models loaded\n");
  }).catch((err) => {
    logger.error("  ⚠️  Face models failed to load:", err.message);
  });

  // Scheduled tasks
  cleanupExpiredAuthorizations();
  cleanupDemoAccounts();
  performBackup();

  setInterval(() => {
    performBackup();
    cleanupExpiredAuthorizations();
    cleanupDemoAccounts();
    cleanupOldAuditLogs();
  }, 6 * 60 * 60 * 1000);

  setInterval(() => {
    cleanupExpiredAuthorizations();
  }, 60 * 60 * 1000);
});
