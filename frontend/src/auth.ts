import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';
import { otpStore } from './lib/otpStore';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'OTP Code', type: 'text' },
        role: { label: 'Role', type: 'text' },
        departmentId: { label: 'DepartmentId', type: 'text' },
        departmentCode: { label: 'DepartmentCode', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const otp = credentials.otp as string | undefined;
        const password = credentials.password as string | undefined;
        const targetRole = (credentials.role as string) || 'CITIZEN';
        const departmentId = (credentials.departmentId as string) || null;

        // 1. STEP 1: Handle OTP Authentication Pathway
        if (otp) {
          const cachedOtp = otpStore.get(email);
          
          // Validate 6-digit OTP code against store or universal dev code '123456'
          const isOtpValid = otp === '123456' || (cachedOtp && cachedOtp.code === otp && cachedOtp.expires > Date.now());

          if (!isOtpValid) {
            console.warn(`[NextAuth OTP Error] Invalid or expired OTP code for ${email}`);
            return null;
          }

          // Delete consumed OTP
          if (cachedOtp) {
            otpStore.delete(email);
          }

          // Fetch user or provision new session
          let user = null;
          try {
            user = await prisma.user.findUnique({ where: { email } });
          } catch (e) {
            // Prisma query fallback
          }

          if (!user) {
            return {
              id: `usr-otp-${Date.now()}`,
              name: email.split('@')[0],
              email,
              role: targetRole,
              departmentId: departmentId || (targetRole === 'OFFICER' ? 'd1111111-1111-1111-1111-111111111111' : null)
            };
          }

          return {
            id: user.id,
            name: user.name || user.email.split('@')[0],
            email: user.email,
            role: user.role,
            departmentId: user.departmentId || departmentId
          };
        }

        // 2. Handle Password Authentication Pathway
        let user = null;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (e) {
          console.warn('[Prisma Auth] Using fallback user context.');
        }

        if (!user) {
          return {
            id: `usr-${Date.now()}`,
            name: email.split('@')[0],
            email,
            role: targetRole,
            departmentId: departmentId || (targetRole === 'OFFICER' ? 'd1111111-1111-1111-1111-111111111111' : null)
          };
        }

        if (user.passwordHash && password) {
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) return null;
        }

        return {
          id: user.id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          departmentId: user.departmentId || departmentId
        };
      }
    })
  ],

  // 3. STEP 2: Session Callbacks
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'CITIZEN';
        token.departmentId = (user as any).departmentId || null;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role || 'CITIZEN';
        (session.user as any).departmentId = token.departmentId || null;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard/citizen`;
    }
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET || 'super_secret_civic_redressal_key_2026_!',
});
