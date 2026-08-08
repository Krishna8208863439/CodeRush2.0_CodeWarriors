import { NextResponse } from 'next/server';
import { otpStore } from '../../../../../lib/otpStore';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), { code: otp, expires });

    console.log(`=======================================================`);
    console.log(`  CIVIC OPERATING SYSTEM OTP SENT TO ${email}: [ ${otp} ]`);
    console.log(`=======================================================`);

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to ${email}. (Development code: ${otp})`,
      demo_otp: otp
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}
