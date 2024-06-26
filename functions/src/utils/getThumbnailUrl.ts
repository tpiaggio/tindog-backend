import path from "path";

const getThumbnailUrl = (filePath: string) => {
  if (!filePath) {
    return "";
  }
  // filePath will always have 'dogs/' at the beginning and the image extension at the end
  const imageExtension = path.extname(filePath);
  const imagePath = filePath.replace("dogs/", "").replace(imageExtension, "");
  return `https://storage.googleapis.com/${
    process.env.STORAGE_BUCKET
  }/${encodeURIComponent(
    `dogs/thumbnails/${imagePath}_200x200${imageExtension}`
  )}`;
};

export default getThumbnailUrl;
