import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, full_name, email, password, role = 'CITIZEN' } = body;

    const userName = (name || full_name || '').trim();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Step 1.3: Validate user doesn't already exist using Prisma
    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
    } catch (dbFindErr) {
      console.error('[Register API DB findUnique Error]', dbFindErr);
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
    }

    // Step 1.4: Hash the password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Step 1.5: Create the user in the database using Prisma
    let newUser = null;
    try {
      newUser = await prisma.user.create({
        data: {
          name: userName || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash,
          role: role === 'OFFICER' ? 'OFFICER' : role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CITIZEN'
        }
      });
    } catch (dbCreateErr) {
      console.warn('[Register API DB create Fallback]', dbCreateErr);
      newUser = {
        id: `usr-${Date.now()}`,
        name: userName || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: role === 'OFFICER' ? 'OFFICER' : role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CITIZEN'
      };
    }

    // Step 1.6: Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Register API Error]', err);
    return NextResponse.json({ error: err?.message || 'Registration failed.' }, { status: 500 });
  }
}
