import { XCircle } from "lucide-react";
export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-subtle p-4 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
        <XCircle className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold text-primary mb-2">
        บัญชีถูกระงับการใช้งานชั่วคราว
      </h1>
      <p className="text-gray-500 max-w-md">
        ขณะนี้ระบบปิดการทดสอบ หรือบัญชีของคุณถูกระงับสิทธิ์ชั่วคราว <br />
        กรุณารออีเมลแจ้งเตือนเมื่อระบบเปิดใช้งานอีกครั้ง
      </p>
    </div>
  );
}
