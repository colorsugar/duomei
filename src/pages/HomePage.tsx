import { AICompanionWall } from "../components/AICompanionWall";
import { ClassicalNotes } from "../components/ClassicalNotes";
import { Contact } from "../components/Contact";
import { EssayList } from "../components/EssayList";
import { Hero } from "../components/Hero";
import { JourneyGrid } from "../components/JourneyGrid";
import { MarqueeLog } from "../components/MarqueeLog";
import { PhotoGallery } from "../components/PhotoGallery";
import { Profile } from "../components/Profile";

export function HomePage() {
  return (
    <main>
      <Hero />
      <MarqueeLog />
      <JourneyGrid />
      <PhotoGallery />
      <ClassicalNotes />
      <EssayList />
      <AICompanionWall />
      <Profile />
      <Contact />
    </main>
  );
}
