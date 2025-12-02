// src/app/api/download/route.ts
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    const { fileKey, originalName } = await request.json();

    // สร้างคำสั่งขอไฟล์
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      // บรรทัดนี้สำคัญ: บังคับให้ Browser ดาวน์โหลดไฟล์ และตั้งชื่อให้สวยงามเหมือนเดิม
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
        originalName
      )}"`,
    });

    // สร้างลิงก์ที่มีอายุ 1 ชั่วโมง (3600 วินาที)
    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

    return NextResponse.json({ url: signedUrl });
  } catch (error: any) {
    console.error("Download Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
