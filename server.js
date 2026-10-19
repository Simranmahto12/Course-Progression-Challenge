/**
 * MIRAI SCHOOL OF TECHNOLOGY (MSOT) — COURSE PROGRESSION PLATFORM
 * Node.js (Express) Production Backend Server
 * 
 * Features:
 * - 100% Pure JavaScript (ES Modules, zero TypeScript required)
 * - Mobile Number + Mock OTP Authentication (Configurable via .env, default 123456)
 * - Optional Google OAuth Integration (Client ID & Secret from .env)
 * - Serves Static Web Frontend (index.html, styles.css, app.js, assets) from root
 * - Self-contained SQLite Academic Progression Engine
 */

import 'dotenv/config';
import app from './backend/src/app.js';

const PORT = process.env.PORT || 3000;
const DEMO_OTP = process.env.DEMO_OTP || '123456';

const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Mirai MSOT Course Progression Platform Live!`);
  console.log(`👉 Web Portal:    http://localhost:${PORT}`);
  console.log(`👉 Health Check:  http://localhost:${PORT}/api/health`);
  console.log(`📱 Demo OTP Code: ${DEMO_OTP}`);
  console.log(`⚡ Environment:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down server...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\nTerminating server...');
  server.close(() => process.exit(0));
});

export default app;
