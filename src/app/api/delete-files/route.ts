import { NextResponse } from "next/server";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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
    const { fileKeys } = await request.json(); // รับ Array รายชื่อไฟล์ [ 'file1.jpg', 'file2.wav' ]

    if (!fileKeys || fileKeys.length === 0) {
      return NextResponse.json({ message: "No files to delete" });
    }

    // สั่งลบทีละหลายไฟล์ (Batch Delete)
    const command = new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: {
        Objects: fileKeys.map((key: string) => ({ Key: key })),
        Quiet: true,
      },
    });

    await R2.send(command);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete R2 Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
