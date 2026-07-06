import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      wonPrizes: {
        select: {
          id: true,
          prize: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
  console.log("PLAYERS:", JSON.stringify(users, null, 2));
}

main().catch(console.error);
