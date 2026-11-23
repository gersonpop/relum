import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class ImageStorageService {
  static isCloudinaryConfigured(): boolean {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    return !!(cloudName && apiKey && apiSecret);
  }

  static async uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    if (this.isCloudinaryConfigured()) {
      try {
        return await this.uploadToCloudinary(fileBuffer, mimeType);
      } catch (err) {
        console.warn("Cloudinary upload failed, falling back to local storage:", err);
        return await this.uploadToLocal(fileBuffer, fileName, mimeType);
      }
    } else {
      return await this.uploadToLocal(fileBuffer, fileName, mimeType);
    }
  }

  private static async uploadToCloudinary(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary configuration");
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    const formData = new FormData();
    const base64Data = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    formData.append("file", base64Data);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });

    const resBody = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(resBody.error?.message || "Upload to Cloudinary failed");
    }

    return resBody.secure_url;
  }

  private static async uploadToLocal(fileBuffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
    // En producción (Docker) UPLOADS_DIR apunta a un volumen persistente y las fotos se sirven
    // por /api/v1/files/<nombre>. Sin UPLOADS_DIR (desarrollo) se guardan en public/uploads.
    const customDir = process.env.UPLOADS_DIR;
    const uploadsDir = customDir || path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // La extensión sale del tipo de archivo validado, nunca del nombre que manda el usuario.
    const extByMime: Record<string, string> = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"};
    void fileName;
    const ext = (mimeType && extByMime[mimeType]) || ".png";
    const uniqueName = `avatar-${Date.now()}-${Math.floor(Math.random() * 100000)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    await fs.writeFile(filePath, fileBuffer);
    return customDir ? `/api/v1/files/${uniqueName}` : `/uploads/${uniqueName}`;
  }
}
