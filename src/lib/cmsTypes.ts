export type ContentType = "journey" | "photo" | "note" | "essay" | "ai-wall";
export type ContentStatus = "published" | "draft";

export type ContentItem = {
  id: string;
  slug: string;
  type: ContentType;
  title: string;
  subtitle?: string;
  date: string;
  location?: string;
  category?: string;
  tags: string[];
  excerpt: string;
  body: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  status: ContentStatus;
  showOnHome: boolean;
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  name: string;
  displayName: string;
  bio: string;
  location: string;
  origin: string;
  occupation: string;
  interests: string[];
  avatarUrl: string;
};

export type Settings = {
  siteTitle: string;
  siteSubtitle: string;
  introYear: string;
  instagramUrl: string;
  email: string;
  githubUrl: string;
};

export type CmsState = {
  items: ContentItem[];
  profile: Profile;
  settings: Settings;
};
