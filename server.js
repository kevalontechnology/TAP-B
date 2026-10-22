import { app } from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { config } from './src/config/env.js';

async function bootstrap() {
  try {
    console.log('--- Kevalon Technology / Tapzy Dynamic QR System ---');
    console.log(`Environment: ${config.env}`);

    // Connect to MongoDB Atlas (tapzy_db)
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`[Server] Backend API running at http://localhost:${config.port}`);
      console.log(`[Server] Dynamic QR Redirection Engine at http://localhost:${config.port}/q/:publicCode`);
      console.log(`[Server] Default Super Admin: admin@tapzy.in / Admin@123456`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] MongoDB disconnected and server terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Startup error:', err);
    process.exit(1);
  }
}

bootstrap();
