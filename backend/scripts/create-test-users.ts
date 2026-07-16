import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Test1234!', 10);
  
  const users = [
    { email: 'mardin@test.com', firstName: 'Mardin', lastName: 'Test', city: 'Mardin', phone: '05551112233' },
    { email: 'istanbul@test.com', firstName: 'Istanbul', lastName: 'Test', city: 'İstanbul', phone: '05552223344' },
    { email: 'artvin@test.com', firstName: 'Artvin', lastName: 'Test', city: 'Artvin', phone: '05553334455' }
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          city: u.city,
          phone: u.phone,
          passwordHash: hashedPassword,
          role: 'CITIZEN',
          isVerified: true
        }
      });
      console.log('Created:', u.email);
    } else {
      console.log('Exists:', u.email);
    }
  }
}

main().catch(console.error).finally(() => { prisma.$disconnect() });
