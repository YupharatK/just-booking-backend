# Just Booking Backend

Backend พื้นฐานสำหรับแอปพลิเคชันจองหอพัก เขียนด้วย Node.js, Express และ MySQL

## เริ่มใช้งาน

1. คัดลอก `.env.example` เป็น `.env`
2. ใส่ค่า Aiven MySQL ใน `.env`
3. ใส่ค่า Cloudinary ใน `.env` เพื่อใช้อัปโหลดรูปภาพ
4. รัน `npm install`
5. รัน `npm start`

เมื่อ server เริ่มทำงาน ระบบจะสร้างตารางให้อัตโนมัติด้วย `CREATE TABLE IF NOT EXISTS`

## API หลัก

- `POST /api/auth/register` สมัครสมาชิกหรือเจ้าของหอพัก
- `POST /api/auth/login` เข้าสู่ระบบ
- `GET /api/dormitories` ค้นหาหอพัก
- `GET /api/dormitories/:id` ดูรายละเอียดหอพัก
- `POST /api/favorites/:dormitoryId` เพิ่มรายการโปรด
- `POST /api/bookings` จองห้องพัก
- `POST /api/bookings/:bookingId/payment-slip` ส่งหลักฐานชำระเงิน
- `POST /api/dormitories/:dormitoryId/reviews` รีวิวหอพัก
- `POST /api/owner/dormitories` เจ้าของเพิ่มหอพัก
- `POST /api/owner/dormitories/:id/cover-image` เจ้าของอัปโหลดรูปหน้าปกหอพัก 1 รูป ใช้ `multipart/form-data` field `coverImage`
- `POST /api/owner/dormitories/:dormitoryId/rooms` เจ้าของเพิ่มห้องพัก
- `POST /api/owner/rooms/:roomId/images` เจ้าของอัปโหลดรูปห้องตัวอย่างสูงสุด 5 รูป ใช้ `multipart/form-data` field `roomImages`
- `PATCH /api/admin/dormitories/:id/approve` แอดมินอนุมัติหอพัก
- `PATCH /api/admin/bookings/:bookingId/payment` แอดมินตรวจชำระเงิน

ส่ง token ด้วย header:

```txt
Authorization: Bearer <token>
```

## Test Cases

ดูชุดทดสอบ API ครบทุกฟังก์ชันได้ที่ [API_TEST_CASES.md](./API_TEST_CASES.md)

## การเก็บรูปภาพ

- รูปหน้าปกหอพักเก็บใน Cloudinary และบันทึก URL ไว้ที่ `dormitories.cover_image_url`
- หอพักมีรูปหน้าปกได้ 1 รูป ถ้าอัปโหลดใหม่ ระบบจะแทนที่ URL เดิม
- รูปห้องตัวอย่างเก็บในตาราง `room_images`
- ห้องหนึ่งเพิ่มรูปตัวอย่างได้สูงสุด 5 รูป
