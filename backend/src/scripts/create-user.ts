import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createUser() {
  try {
    const email = 'samanthastultz@gmail.com';
    const password = '2887903';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'admin'
      },
      create: {
        email,
        password: hashedPassword,
        role: 'admin'
      }
    });
    
    console.log('✅ User created/updated successfully:', {
      email: user.email,
      role: user.role,
      id: user.id
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();