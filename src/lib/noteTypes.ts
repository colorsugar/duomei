export type NoteStatus = "published" | "draft";

export type NoteContentBlock =
  | { id: string; type: "paragraph"; text: string }
  | {
      id: string;
      type: "image";
      src: string;
      alt?: string;
      caption?: string;
      width?: number;
      align?: "left" | "center" | "right" | "full";
      zoom?: number;
      maxWidth?: number;
      aspectRatio?: "original" | "1:1" | "4:3" | "3:2" | "16:9" | "9:16";
      objectFit?: "contain" | "cover";
      crop?: {
        x: number;
        y: number;
        scale: number;
        rotate?: number;
      };
    }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "divider" };

export type DuomeiNote = {
  id: string;
  slug: string;
  title: string;
  date: string;
  location: string;
  category: string;
  tags: string[];
  excerpt: string;
  body: string;
  coverImageUrl: string;
  bodyImages: string[];
  contentBlocks: NoteContentBlock[];
  stylePrompt: string;
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
};

export type NoteState = {
  notes: DuomeiNote[];
};
