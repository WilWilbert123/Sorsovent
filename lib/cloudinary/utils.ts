export interface CloudinaryAccount {
  cloudName: string;
  uploadPreset: string;
}

/**
 * Returns list of configured Cloudinary accounts (supports up to 5 multi-accounts for load-balancing/quota fallback)
 */
export function getCloudinaryAccounts(): CloudinaryAccount[] {
  const accounts: CloudinaryAccount[] = [];

  // Account 1 (Default)
  const cloud1 = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_1;
  const preset1 = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_1 || "sorsovent_1";
  if (cloud1) accounts.push({ cloudName: cloud1, uploadPreset: preset1 });

  // Account 2
  const cloud2 = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_2;
  const preset2 = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_2 || preset1;
  if (cloud2) accounts.push({ cloudName: cloud2, uploadPreset: preset2 });

  // Account 3
  const cloud3 = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_3;
  const preset3 = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_3 || preset1;
  if (cloud3) accounts.push({ cloudName: cloud3, uploadPreset: preset3 });

  // Account 4
  const cloud4 = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_4;
  const preset4 = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_4 || preset1;
  if (cloud4) accounts.push({ cloudName: cloud4, uploadPreset: preset4 });

  // Account 5
  const cloud5 = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_5;
  const preset5 = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_5 || preset1;
  if (cloud5) accounts.push({ cloudName: cloud5, uploadPreset: preset5 });

  if (accounts.length === 0) {
    accounts.push({ cloudName: "demo", uploadPreset: "sorsovent_1" });
  }

  return accounts;
}

export function getCloudinaryUrl(publicId: string, options?: { width?: number; height?: number; crop?: string }) {
  if (!publicId) return "";

  if (publicId.startsWith("http")) return publicId;
  
  const accounts = getCloudinaryAccounts();
  const cloudName = accounts[0].cloudName;
  
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
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}${publicId}`;
}
