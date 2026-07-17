import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Etiya2026!', 10);
  
  // Önce varsa sil (olası hataları önlemek için)
  await prisma.user.deleteMany({
    where: { email: 'beyzaggok@gmail.com' }
  });
  
  await prisma.user.create({
    data: {
      email: 'beyzaggok@gmail.com',
      passwordHash: hashedPassword,
      firstName: 'Beyza',
      lastName: 'Gök',
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });
  console.log('✅ beyzaggok@gmail.com hesabı eklendi!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
