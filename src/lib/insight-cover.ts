import star from "@/assets/insights/cover-star.jpg";
import ribbon from "@/assets/insights/cover-ribbon.jpg";
import goldPattern from "@/assets/insights/cover-gold-pattern.jpg";
import bluePattern from "@/assets/insights/cover-blue-pattern.jpg";
import blueUi from "@/assets/insights/cover-blue-ui.jpg";
import rainbow from "@/assets/insights/cover-rainbow.jpg";

// Every article (old and new) uses one of these Google Cloud blog-style covers,
// picked by a stable hash of the title so each article always gets the same one.
const COVERS = [star, goldPattern, blueUi, ribbon, bluePattern, rainbow];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function fallbackInsightCover(title: string, category = ""): string {
  return COVERS[hash(`${title}|${category}`) % COVERS.length];
}

export function insightCoverUrl(title: string, category: string, _imageUrl?: string | null): string {
  return fallbackInsightCover(title, category);
}
