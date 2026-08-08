import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_fsi84cm';
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_2sqcfjk';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'R2b1Qn1tki_X1POof';

export async function sendOtpEmail(userEmail: string, generatedOtp: string): Promise<boolean> {
  try {
    // Multi-key payload to match any EmailJS template variable naming convention
    const templateParams = {
      to_email: userEmail,
      email: userEmail,
      otp_code: generatedOtp,
      otp: generatedOtp,
      code: generatedOtp,
      passcode: generatedOtp,
      message: `Your official portal verification OTP code is: ${generatedOtp}. Valid for 5 minutes.`
    };

    if (typeof window !== 'undefined') {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      console.log(`[EmailJS] Multi-key OTP payload dispatched to ${userEmail} with code [${generatedOtp}]`);
      return true;
    }
    return true;
  } catch (err) {
    console.error('[EmailJS Send Error]', err);
    return false;
  }
}
