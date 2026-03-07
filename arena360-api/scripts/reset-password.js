/**
 * Reset a user's password by email (for local/dev when you forget credentials).
 * Run from arena360-api folder. Requires .env with DATABASE_URL.
 * Usage: node scripts/reset-password.js <email> <newPassword>
 * Example: node scripts/reset-password.js admin@nebula.com MyNewPass123
 */
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-password.js <email> <newPassword>');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('User not found for email:', email);
    process.exit(1);
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  });
  console.log('Password updated for', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
