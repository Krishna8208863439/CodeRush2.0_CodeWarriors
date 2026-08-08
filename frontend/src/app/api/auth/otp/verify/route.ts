import { NextResponse } from 'next/server';
import { otpStore } from '../../../../../lib/otpStore';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP code are required.' }, { status: 400 });
    }

    const cached = otpStore.get(email.toLowerCase());

    // Allow universal testing OTP '123456' or cached code match
    if (otp === '123456' || (cached && cached.code === otp && cached.expires > Date.now())) {
      otpStore.delete(email.toLowerCase());
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully.',
        user: { email, role: 'CITIZEN' }
      });
    }

    return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'OTP verification failed.' }, { status: 500 });
  }
}
