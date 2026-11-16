import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Story } from "@/lib/stories";

export function storyMinutes(story: Story) {
  const words = [story.intro, ...story.feature.text, story.banner.text, ...story.steps.points].join(' ').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 220));
}

export default function StoryTile({ story }: { story: Story }) {
  return <Link to="/stories/$slug" params={{slug:story.slug}} className="group block min-w-0">
    <div className="overflow-hidden rounded-lg bg-muted"><img src={story.img} alt={story.feature.caption} width="640" height="400" loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"/></div>
    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground"><span>{story.tag.trim() || 'MARKET GUIDES'}</span><span>·</span><span>{storyMinutes(story)} min read</span></div>
    <h3 className="mt-3 text-xl font-normal leading-snug group-hover:underline">{story.title}<ArrowUpRight className="ml-1 inline h-4 w-4"/></h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{story.intro}</p>
  </Link>;
}