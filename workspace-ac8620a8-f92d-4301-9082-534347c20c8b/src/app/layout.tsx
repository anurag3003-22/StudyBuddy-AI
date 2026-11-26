import type { Metadata } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyBuddy AI — Personalized Learning & Source-Cited Doubt Agent",
  description:
    "Transform scattered syllabus PDFs and class notes into adaptive study schedules, automated quizzes, and grounded answers with exact page citations. Zero hallucinations, maximum mastery.",
  keywords: [
    "StudyBuddy AI",
    "study planner",
    "AI tutor",
    "RAG",
    "quiz generator",
    "exam preparation",
    "cited answers",
  ],
  authors: [{ name: "StudyBuddy AI" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "StudyBuddy AI",
    description:
      "Personalized Learning & Source-Cited Doubt Agent — from exam chaos to structured mastery.",
    siteName: "StudyBuddy AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
