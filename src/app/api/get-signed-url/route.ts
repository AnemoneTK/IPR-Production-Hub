import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ตั้งค่า R2 Client
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: "File URL is required" },
        { status: 400 }
      );
    }

    // ดึงชื่อไฟล์ (Key) ออกมาจาก URL
    // สมมติ URL: https://...r2.../12345_random.mp3 -> เราจะเอาแค่ 12345_random.mp3
    const fileKey = fileUrl.split("/").pop();

    if (!fileKey) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    // สร้าง Signed URL สำหรับ "ดู/เล่น" (GetObject) มีอายุ 1 ชั่วโมง (3600 วินาที)
    const signedUrl = await getSignedUrl(
      R2,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      }),
      { expiresIn: 3600 }
    );

    return NextResponse.json({ signedUrl });
  } catch (error: any) {
    console.error("Get Signed URL Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
