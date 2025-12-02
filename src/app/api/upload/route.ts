// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabase } from "@/lib/supabaseClient"; // ใช้ตัวนี้เช็ค Auth เบื้องต้น (หรือจะใช้ cookies ก็ได้)

// ตั้งค่า Client เพื่อคุยกับ R2
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
    // 1. รับข้อมูลจากหน้าบ้านว่าจะอัปไฟล์ชื่ออะไร
    const { name, type } = await request.json();

    // 2. สร้างชื่อไฟล์ใหม่ไม่ให้ซ้ำ (เติมตัวเลขเวลาเข้าไป)
    const fileExtension = name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${fileExtension}`;

    // 3. สร้าง "บัตรผ่าน" (Presigned URL) มีอายุ 5 นาที
    const signedUrl = await getSignedUrl(
      R2,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        ContentType: type,
        // ACL: 'public-read', // ถ้า Bucket เป็น Public เปิดบรรทัดนี้ได้
      }),
      { expiresIn: 300 }
    );

    // 4. ส่งลิงก์กลับไปให้หน้าบ้าน
    return NextResponse.json({
      url: signedUrl,
      fileName: fileName, // ส่งชื่อไฟล์ที่ตั้งใหม่กลับไปด้วย เดี๋ยวต้องเอาไปเก็บใน Database
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
