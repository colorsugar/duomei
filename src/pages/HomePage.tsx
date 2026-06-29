import { AICompanionWall } from "../components/AICompanionWall";
import { ClassicalNotes } from "../components/ClassicalNotes";
import { Contact } from "../components/Contact";
import { EssayList } from "../components/EssayList";
import { Hero } from "../components/Hero";
import { FooterIllustration } from "../components/FooterIllustration";
import { JourneyGrid } from "../components/JourneyGrid";
import { MarqueeLog } from "../components/MarqueeLog";
import { MaskScrollSections } from "../components/MaskScrollSections";
import { PhotoGallery } from "../components/PhotoGallery";
import { Profile } from "../components/Profile";

export function HomePage() {
  return (
    <main>
      <MaskScrollSections>
        <div>
          <Hero />
          <MarqueeLog />
        </div>
        <JourneyGrid />
        <PhotoGallery />
        <ClassicalNotes />
        <EssayList />
        <AICompanionWall />
        <Profile />
        <Contact />
        <FooterIllustration />
      </MaskScrollSections>
    </main>
  );
}
