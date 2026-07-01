export type CompressedImage = {
  dataUrl: string;
  beforeBytes: number;
  afterBytes: number;
};

export type ImageCompressionMode = "cover" | "article";

const compressionSettings = {
  cover: { maxWidth: 1600, maxHeight: 1000, quality: 0.82 },
  article: { maxWidth: 2400, maxHeight: 1800, quality: 0.9 },
} satisfies Record<ImageCompressionMode, { maxWidth: number; maxHeight: number; quality: number }>;

export async function compressImage(file: File, mode: ImageCompressionMode): Promise<CompressedImage> {
  const settings = compressionSettings[mode];
  return compressImageFileWithMeta(file, settings.maxWidth, settings.quality, settings.maxHeight);
}

export async function compressImageFile(file: File, maxWidth = 1600, quality = 0.82, maxHeight = 1000): Promise<string> {
  const result = await compressImageFileWithMeta(file, maxWidth, quality, maxHeight);
  return result.dataUrl;
}

export async function compressImageFileWithMeta(
  file: File,
  maxWidth = 1800,
  quality = 0.82,
  maxHeight = 1200,
): Promise<CompressedImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { dataUrl, beforeBytes: file.size, afterBytes: estimateDataUrlBytes(dataUrl) };
  context.drawImage(image, 0, 0, width, height);
  const webp = canvas.toDataURL("image/webp", quality);
  const compressed = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
  return { dataUrl: compressed, beforeBytes: file.size, afterBytes: estimateDataUrlBytes(compressed) };
}

export async function transformImageDataUrl(
  dataUrl: string,
  options: { zoom?: number; rotation?: number; aspect?: "original" | "16:10" | "4:3" | "1:1"; quality?: number } = {},
): Promise<CompressedImage> {
  const image = await loadImage(dataUrl);
  const sourceBytes = estimateDataUrlBytes(dataUrl);
  const aspectMap = {
    original: image.width / image.height,
    "16:10": 16 / 10,
    "4:3": 4 / 3,
    "1:1": 1,
  };
  const aspect = aspectMap[options.aspect ?? "original"];
  const maxWidth = Math.min(2200, image.width);
  const width = maxWidth;
  const height = Math.round(width / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { dataUrl, beforeBytes: sourceBytes, afterBytes: sourceBytes };

  context.fillStyle = "#faf7f0";
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(((options.rotation ?? 0) * Math.PI) / 180);
  const zoom = Math.max(0.6, Math.min(3, (options.zoom ?? 100) / 100));
  const coverScale = Math.max(width / image.width, height / image.height) * zoom;
  context.drawImage(image, (-image.width * coverScale) / 2, (-image.height * coverScale) / 2, image.width * coverScale, image.height * coverScale);
  context.restore();

  const next = canvas.toDataURL("image/webp", options.quality ?? 0.9);
  return { dataUrl: next, beforeBytes: sourceBytes, afterBytes: estimateDataUrlBytes(next) };
}

export function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.round((base64.length * 3) / 4);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
