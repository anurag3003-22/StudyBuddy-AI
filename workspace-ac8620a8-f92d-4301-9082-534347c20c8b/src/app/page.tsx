import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import SubjectMarquee from "@/components/landing/marquee";
import Problem from "@/components/landing/problem";
import Features from "@/components/landing/features";
import AppDemo from "@/components/studybuddy/app-demo";
import Walkthrough from "@/components/landing/walkthrough";
import Architecture from "@/components/landing/architecture";
import Advantages from "@/components/landing/advantages";
import CtaSection from "@/components/landing/cta";
import Footer from "@/components/landing/footer";
import DownloadSourceButton from "@/components/landing/download-button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <SubjectMarquee />
        <Problem />
        <Features />
        <AppDemo />
        <Walkthrough />
        <Architecture />
        <Advantages />
        <CtaSection />
      </main>
      <Footer />
      <DownloadSourceButton />
    </div>
  );
}
