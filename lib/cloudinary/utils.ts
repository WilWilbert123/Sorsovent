export function getCloudinaryUrl(publicId: string, options?: { width?: number; height?: number; crop?: string }) {
  if (!publicId) return "";
  
  // Basic URL construction
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  let transformations = "";
  if (options) {
    const parts = [];
    if (options.crop) parts.push(`c_${options.crop}`);
    if (options.width) parts.push(`w_${options.width}`);
    if (options.height) parts.push(`h_${options.height}`);
    
    if (parts.length > 0) {
      transformations = parts.join(",") + "/";
    }
  }

  // Handle fully qualified URLs vs public IDs
  if (publicId.startsWith("http")) return publicId;
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}${publicId}`;
}
