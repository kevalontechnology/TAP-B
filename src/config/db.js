import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env.js';
import { User } from '../models/User.js';

// Configure reliable DNS servers for MongoDB Atlas SRV resolution on Windows
if (config.mongodbUri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (dnsErr) {
    console.warn('[Database] Could not set custom DNS servers:', dnsErr.message);
  }
}

let mongoMemoryServer = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let connected = false;

  // Try connecting to real MongoDB if not forced in-memory
  if (config.useInMemoryDb !== 'true') {
    try {
      console.log(`[Database] Attempting connection to MongoDB at ${config.mongodbUri}...`);
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('[Database] Connected successfully to MongoDB.');
      connected = true;
    } catch (err) {
      console.warn(`[Database] Real MongoDB connection failed: ${err.message}`);
    }
  }

  // Fallback to in-memory MongoDB if configured or real connection failed
  if (!connected) {
    console.log('[Database] Starting in-memory MongoDB server (mongodb-memory-server)...');
    try {
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'tapzy_qr_db',
        },
      });
      const uri = mongoMemoryServer.getUri();
      console.log(`[Database] MongoMemoryServer started at ${uri}`);
      await mongoose.connect(uri);
      console.log('[Database] Connected successfully to in-memory MongoDB.');
      connected = true;
    } catch (memErr) {
      console.error('[Database] Failed to start in-memory MongoDB:', memErr.message);
      throw memErr;
    }
  }

  // Seed default Super Admin user if not exists
  await seedDefaultUsers();

  return mongoose.connection;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}

async function seedDefaultUsers() {
  try {
    const existingAdmin = await User.findOne({ email: /^admin@tapzy\.in$/i });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123456', salt);

      try {
        await User.create({
          name: 'Tapzy Super Admin',
          email: 'admin@tapzy.in',
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        });
        console.log('[Database] Super Admin seeded: admin@tapzy.in (Password: Admin@123456)');
      } catch (e) {
        if (e.code !== 11000) console.warn('[Database] Seed admin note:', e.message);
      }
    }

    const existingStaff = await User.findOne({ email: /^staff@tapzy\.in$/i });
    if (!existingStaff) {
      const salt = await bcrypt.genSalt(10);
      const staffPasswordHash = await bcrypt.hash('Staff@123456', salt);
      try {
        await User.create({
          name: 'Tapzy Staff Member',
          email: 'staff@tapzy.in',
          passwordHash: staffPasswordHash,
          role: 'STAFF',
          isActive: true,
        });
        console.log('[Database] Staff user seeded: staff@tapzy.in (Password: Staff@123456)');
      } catch (e) {
        if (e.code !== 11000) console.warn('[Database] Seed staff note:', e.message);
      }
    }
  } catch (err) {
    console.error('[Database] Error checking default users:', err.message);
  }
}
