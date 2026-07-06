import 'dotenv/config';
import { prisma } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🔒 Seeding admin and partner passwords...');

  const credentials = [
    { email: 'admin@agency.com', password: 'admin' },
    { email: 'manager@obooking.com', password: 'obooking' }
  ];

  for (const cred of credentials) {
    const user = await prisma.user.findUnique({
      where: { email: cred.email }
    });

    if (user) {
      const hash = await bcrypt.hash(cred.password, 10);
      await prisma.user.update({
        where: { email: cred.email },
        data: { passwordHash: hash }
      });
      console.log(`[Success] Updated ${cred.email} with hashed password.`);
    } else {
      console.warn(`[Warning] User ${cred.email} not found in database, skipping.`);
    }
  }

  console.log('✅ Admin and partner password seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
