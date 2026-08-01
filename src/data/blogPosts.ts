import { formatDate } from '../utils/formatDate';

export type BlogPost = {
  title: string;
  category: string;
  description: string;
  slug: string;
  date: string | Date;
  readingTime: string;
  image: string;
  imageAlt: string;
  draft?: boolean;
};

type ContentBlogEntry = {
  slug: string;
  data: {
    title: string;
    category: string;
    description: string;
    date: string | Date;
    readingTime: string;
    image?: string;
    imageAlt?: string;
    draft?: boolean;
  };
};

export const staticBlogPosts: BlogPost[] = [
  {
    title: 'Two Sunrises, No Stopover: What the A350-1000ULR Means for the Future of Ultra-Long-Haul Aviation',
    category: 'Aviation Analysis',
    description:
      'A 24-hour test flight proved that the aircraft can do it. The harder question is whether passengers, airline economics and the climate can.',
    slug: 'a350-1000ulr-future-ultra-long-haul-aviation',
    date: '2026-08-01',
    readingTime: '12 min read',
    image: 'blog/a350-1000ulr-future-ultra-long-haul-aviation/hero.png',
    imageAlt: 'Illustration of an ultra-long-range twin-engine airliner flying from Australia toward a second sunrise over the curved Earth.',
  },
  {
    title: "When Celebration Stops an Airport: DCA's July 4 Ground Stop and the Network Impact of Planned Airspace Closures",
    category: 'Airport Operations',
    description:
      'How a planned America 250 airspace closure at Reagan National becomes a case study in FAA flow control, passenger spillover, and network resilience.',
    slug: 'dca-july-4-ground-stop-network-impact',
    date: '2026-06-24',
    readingTime: '9 min read',
    image: 'images/blog/dca-7-4-groundstop/dca-control-tower-context.jpg',
    imageAlt: 'DCA control tower and terminal area with an aircraft flying above Reagan National Airport.',
  },
  {
    title: 'Why World Cup 2026 Is Different from Qatar 2022',
    category: 'Transportation Geography',
    description:
      'How a compact tournament became a continental transportation problem - and why aviation now matters between matches.',
    slug: 'world-cup-2026-vs-qatar-2022',
    date: '2026-06-20',
    readingTime: '6 min read',
    image: 'research/world-cup-network-hero.png',
    imageAlt: 'Flight paths connecting World Cup host cities across North America.',
  },
  {
    title: 'World Cup 2026 and the U.S. Aviation System',
    category: 'Airline Operations',
    description:
      'Demand waves, summer thunderstorms, and what I observed while traveling through Houston during consecutive matchdays.',
    slug: 'world-cup-us-aviation-system',
    date: '2026-06-20',
    readingTime: '7 min read',
    image: 'research/houston-match-attendance.jpg',
    imageAlt: 'Germany versus Curacao scoreboard and attendance display in Houston.',
  },
  {
    title: 'Hubs, Alliances, and World Cup Mobility',
    category: 'Aviation Networks',
    description:
      'How the tournament temporarily reweights passenger flows across a network shaped by alliances, central hubs, and connectivity.',
    slug: 'hubs-alliances-world-cup-mobility',
    date: '2026-06-20',
    readingTime: '8 min read',
    image: 'blog/hubs-alliances-world-cup-mobility-hero.png',
    imageAlt: 'North American airline hubs connected by alliance network flows.',
  },
];

function dateValue(date: string | Date) {
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.valueOf()) ? 0 : parsed.valueOf();
}

export function getPublishedBlogPosts() {
  return getSortedBlogPosts(staticBlogPosts);
}

export function getSortedBlogPosts(posts: BlogPost[]) {
  return posts
    .filter((post) => !post.draft)
    .slice()
    .sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

export function normalizeContentBlogPost(entry: ContentBlogEntry): BlogPost {
  return {
    title: entry.data.title,
    category: entry.data.category,
    description: entry.data.description,
    slug: entry.slug,
    date: entry.data.date,
    readingTime: entry.data.readingTime,
    image: entry.data.image ?? 'blog/hubs-alliances-world-cup-mobility-hero.png',
    imageAlt: entry.data.imageAlt ?? `${entry.data.title} cover image`,
    draft: entry.data.draft,
  };
}

export function combineBlogPosts(contentPosts: BlogPost[]) {
  const bySlug = new Map<string, BlogPost>();
  for (const post of staticBlogPosts) bySlug.set(post.slug, post);
  for (const post of contentPosts) bySlug.set(post.slug, post);
  return getSortedBlogPosts([...bySlug.values()]);
}

export function getBlogPostHref(post: BlogPost, base = '/') {
  return `${base}blog/${post.slug}/`;
}

export function getBlogPostImage(post: BlogPost, base = '/') {
  return `${base}${post.image}`;
}

export function getBlogPostMeta(post: BlogPost) {
  const parsed = post.date instanceof Date ? post.date : new Date(post.date);
  const displayDate = Number.isNaN(parsed.valueOf()) ? String(post.date) : formatDate(parsed);
  return `${displayDate} · ${post.readingTime}`;
}
