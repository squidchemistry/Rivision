/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS script run with node */
// Creates the admin account, or resets its password and role if it already exists.
// Usage: set ADMIN_EMAIL and ADMIN_PASSWORD in .env (or the shell), then run
//   node scripts/generate-admin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 12;

async function generateAdminCredentials() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.');
    process.exitCode = 1;
    return;
  }
  if (adminPassword.length < MIN_PASSWORD_LENGTH) {
    console.error(`❌ ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashedPassword, role: 'admin' },
      create: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        plan: 'premium',
      },
    });

    console.log(`✅ Admin account ready: ${adminEmail} (id ${adminUser.id})`);
    console.log('   The password is the ADMIN_PASSWORD value; remove it from .env once you have stored it safely.');
  } catch (error) {
    console.error('❌ Error generating admin credentials:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

generateAdminCredentials();
