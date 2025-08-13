import HeroSection from "@/components/hero-section";
import ContentSection from "@/components/content";
import Features from "@/components/features";
import FAQs from "@/components/faqs";
import TeamSection from "@/components/team";
import FooterSection from "@/components/footer";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ContentSection />
      <Features />
      <TeamSection />
      <FAQs />
      <FooterSection />
    </>
  );
}