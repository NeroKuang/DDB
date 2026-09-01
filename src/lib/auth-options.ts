import "@/lib/auth-env";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyCredentials } from "@/auth/accounts";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Username",
      credentials: {
        username: { label: "帳號", type: "text" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) {
          return null;
        }
        const user = await verifyCredentials(username, password);
        if (!user) {
          return null;
        }
        return {
          id: user.id,
          name: user.username,
          role: user.role,
          staffId: user.staffId,
          primaryNickname: user.primaryNickname,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.name ?? undefined;
        token.staffId = user.staffId ?? null;
        token.primaryNickname = user.primaryNickname ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.staffId = token.staffId ?? null;
        session.user.primaryNickname = token.primaryNickname ?? null;
      }
      return session;
    },
  },
};
