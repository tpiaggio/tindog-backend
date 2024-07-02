import path from "path";

const getThumbnailPath = (filePath: string) => {
  // filePath will always have 'dogs/' at the beginning and the image extension at the end
  const imageExtension = path.extname(filePath);
  const imagePath = filePath.replace("dogs/", "").replace(imageExtension, "");

  return `dogs/thumbnails/${imagePath}_200x200${imageExtension}`;
};

const getThumbnailUrl = (filePath: string) => {
  if (!filePath) {
    return "";
  }
  const thumbnailPath = getThumbnailPath(filePath);
  return `https://storage.googleapis.com/${
    process.env.STORAGE_BUCKET
  }/${encodeURIComponent(thumbnailPath)}`;
};

export {getThumbnailPath, getThumbnailUrl};
