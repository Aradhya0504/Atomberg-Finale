const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const User = require('./models/User');
const Session = require('./models/Session');
const Participant = require('./models/Participant');
const Message = require('./models/Message');

const dataDir = path.join(__dirname, '../../data/mongodb');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

async function connectDB() {
  const systemUri = process.env.MONGODB_URI;

  // Try system MongoDB first; fall back to embedded MongoMemoryServer
  let uri;
  try {
    await mongoose.connect(systemUri, { serverSelectionTimeoutMS: 3000 });
    uri = systemUri;
    console.log(`[DB] Connected to MongoDB: ${uri}`);
  } catch {
    console.log('[DB] System MongoDB unavailable — starting embedded MongoDB...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbPath: dataDir,
        storageEngine: 'wiredTiger',
      },
    });
    uri = mongod.getUri() + 'atomberg';
    await mongoose.connect(uri);
    console.log(`[DB] Embedded MongoDB running at: ${uri}`);
  }

  await seed();
}

async function seed() {
  const exists = await User.findOne({ email: 'agent@demo.com' });
  if (exists) return;

  await User.insertMany([
    { _id: uuidv4(), email: 'agent@demo.com',  password_hash: bcrypt.hashSync('password123', 10), name: 'Support Agent', role: 'agent',  created_at: Date.now() },
    { _id: uuidv4(), email: 'agent2@demo.com', password_hash: bcrypt.hashSync('password123', 10), name: 'Agent Two',      role: 'agent',  created_at: Date.now() },
    { _id: uuidv4(), email: 'admin@demo.com',  password_hash: bcrypt.hashSync('password123', 10), name: 'Admin User',     role: 'admin',  created_at: Date.now() },
  ]);
  console.log('[DB] Seeded demo users (password: password123)');
}

module.exports = { connectDB, User, Session, Participant, Message };
