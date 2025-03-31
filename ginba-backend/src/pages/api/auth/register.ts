import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt'; // or bcryptjs
import { signToken } from '../../../lib/auth'; // Make sure you have this, same as in login.ts

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Set CORS headers (same as in login.ts)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 2) Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Log incoming data (optional)
    console.log('Registration request body:', req.body);

    const {
      email,
      password,
      firstName,
      lastName,
      birthdate,
      age,
      nationality,
      role,
      companyCode,
      profileImage,
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert role string to UserRole enum (default to EMPLOYEE)
    let userRole: UserRole = UserRole.EMPLOYEE;
    console.log('Received role value:', role);

    if (role) {
      const validRoles = Object.values(UserRole);
      if (validRoles.includes(role)) {
        userRole = role as UserRole;
      } else {
        console.warn(`Invalid role provided: ${role}. Using default EMPLOYEE role.`);
      }
    }
    console.log('Converted role value:', userRole);

    // Parse birthdate if provided
    let parsedBirthdate = null;
    if (birthdate) {
      const tempDate = new Date(birthdate);
      if (!isNaN(tempDate.getTime())) {
        parsedBirthdate = tempDate;
      } else {
        console.warn('Invalid birthdate format:', birthdate);
      }
    }

    // Parse age if provided
    let parsedAge = null;
    if (age) {
      const tempAge = parseInt(age.toString());
      if (!isNaN(tempAge)) {
        parsedAge = tempAge;
      } else {
        console.warn('Invalid age format:', age);
      }
    }

    // Prepare user data for creation
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      birthdate: parsedBirthdate,
      age: parsedAge,
      nationality: nationality || null,
      role: userRole,
      companyCode: companyCode || null,
      profileImage: profileImage || null,
    };

    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });

    // Create user in database
    const user = await prisma.user.create({
      data: userData,
    });

    // 3) Optionally sign a JWT token for the new user
    // Just like your login flow
    const token = signToken({ userId: user.id, role: user.role });

    console.log('User created successfully:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      birthdate: user.birthdate,
      age: user.age,
      companyCode: user.companyCode
    });

    // Return response (no password) + token
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);

    // Graceful error handling
    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as { message: string }).message;
    }

    return res.status(500).json({
      message: 'Error creating user',
      error: errorMessage
    });
  }
}
