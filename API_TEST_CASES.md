# Just Booking API Test Cases

เอกสารนี้ใช้ทดสอบ API ด้วย Postman, Thunder Client หรือ curl โดยสมมติว่า backend รันที่:

```txt
http://localhost:3000
```

## ค่าเริ่มต้นที่ต้องมี

- ตั้งค่า `.env` ให้เชื่อม Aiven MySQL ได้
- ตั้งค่า Cloudinary ให้ครบ
- รัน backend ด้วย `npm start`
- ถ้าต้องการทดสอบแอดมิน ให้ตั้งค่า `ADMIN_EMAIL` และ `ADMIN_PASSWORD` ใน `.env` แล้ว restart backend

## ตัวแปรที่ใช้ระหว่างทดสอบ

บันทึกค่าที่ได้จาก response ไว้ใช้ใน test case ถัดไป:

```txt
memberToken=
ownerToken=
adminToken=
dormitoryId=
roomId=
bookingId=
reviewId=
```

ทุก endpoint ที่ต้อง login ให้ใส่ header:

```txt
Authorization: Bearer <token>
```

## 1. System

### TC-001 Health Check

Request:

```txt
GET /health
```

Expected:

```txt
200 OK
status = "ok"
```

### TC-002 Root API

Request:

```txt
GET /
```

Expected:

```txt
200 OK
name = "Just Booking API"
status = "ok"
```

## 2. Authentication

### TC-003 Register Member

Request:

```txt
POST /api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "email": "member@test.com",
  "password": "123456",
  "role": "member",
  "firstName": "Test",
  "lastName": "Member",
  "nickname": "member",
  "phone": "0800000001",
  "address": "Mahasarakham"
}
```

Expected:

```txt
201 Created
response มี token
user.role = "member"
user.status = "active"
```

Save:

```txt
memberToken = response.token
```

### TC-004 Register Owner

Request:

```txt
POST /api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "email": "owner@test.com",
  "password": "123456",
  "role": "owner",
  "firstName": "Test",
  "lastName": "Owner",
  "phone": "0800000002",
  "address": "Mahasarakham"
}
```

Expected:

```txt
201 Created
response มี token
user.role = "owner"
user.status = "pending"
```

Save:

```txt
ownerToken = response.token
```

### TC-005 Login Member

Request:

```txt
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "member@test.com",
  "password": "123456"
}
```

Expected:

```txt
200 OK
response มี token
```

### TC-006 Login Owner

Request:

```txt
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "owner@test.com",
  "password": "123456"
}
```

Expected:

```txt
200 OK
response มี token
```

### TC-007 Login Admin

Request:

```txt
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "admin@example.com",
  "password": "change-this-admin-password"
}
```

Expected:

```txt
200 OK
response มี token
user.role = "admin"
```

Save:

```txt
adminToken = response.token
```

### TC-008 Get Current User

Request:

```txt
GET /api/auth/me
Authorization: Bearer {{memberToken}}
```

Expected:

```txt
200 OK
response.user.id มีค่า
```

### TC-009 Duplicate Email

Request:

```txt
POST /api/auth/register
```

Body: ใช้ email เดิมจาก TC-003

Expected:

```txt
409 Conflict
message = "อีเมลนี้ถูกใช้งานแล้ว"
```

### TC-010 Invalid Login

Request:

```txt
POST /api/auth/login
```

Body:

```json
{
  "email": "member@test.com",
  "password": "wrong-password"
}
```

Expected:

```txt
401 Unauthorized
```

## 3. Member / Public Dormitory Search

### TC-011 List Dormitories Before Approval

Request:

```txt
GET /api/dormitories
```

Expected:

```txt
200 OK
dormitories เป็น array
หอพักที่ยัง pending ต้องไม่แสดง
```

### TC-012 Update Member Profile

Request:

```txt
PATCH /api/profile
Authorization: Bearer {{memberToken}}
Content-Type: application/json
```

Body:

```json
{
  "nickname": "new-member",
  "phone": "0811111111",
  "address": "New address"
}
```

Expected:

```txt
200 OK
user.nickname = "new-member"
```

## 4. Owner Dormitory Management

### TC-013 Owner Create Dormitory

Request:

```txt
POST /api/owner/dormitories
Authorization: Bearer {{ownerToken}}
Content-Type: application/json
```

Body:

```json
{
  "name": "Just Test Dorm",
  "description": "หอพักสำหรับทดสอบระบบ",
  "address": "ใกล้มหาวิทยาลัยมหาสารคาม",
  "latitude": 16.2465,
  "longitude": 103.2510,
  "distanceFromUniversityKm": 1.2,
  "facilities": ["wifi", "parking", "laundry"],
  "securityFeatures": ["cctv", "keycard"],
  "rentalTerms": "มัดจำ 1 เดือน ล่วงหน้า 1 เดือน",
  "rules": "ห้ามเลี้ยงสัตว์"
}
```

Expected:

```txt
201 Created
response.id มีค่า
message = "ส่งข้อมูลหอพักเพื่อรออนุมัติแล้ว"
```

Save:

```txt
dormitoryId = response.id
```

### TC-014 Owner List My Dormitories

Request:

```txt
GET /api/owner/dormitories
Authorization: Bearer {{ownerToken}}
```

Expected:

```txt
200 OK
dormitories มี dormitoryId จาก TC-013
status = "pending"
```

### TC-015 Owner Update Dormitory

Request:

```txt
PATCH /api/owner/dormitories/{{dormitoryId}}
Authorization: Bearer {{ownerToken}}
Content-Type: application/json
```

Body:

```json
{
  "description": "แก้ไขรายละเอียดหอพักสำหรับทดสอบ",
  "distanceFromUniversityKm": 1.0
}
```

Expected:

```txt
200 OK
message = "อัปเดตข้อมูลหอพักแล้ว"
```

### TC-016 Upload Dormitory Cover Image

Request:

```txt
POST /api/owner/dormitories/{{dormitoryId}}/cover-image
Authorization: Bearer {{ownerToken}}
Content-Type: multipart/form-data
```

Form Data:

```txt
coverImage = test image file
```

Expected:

```txt
200 OK
image.url เป็น Cloudinary URL
ถ้าอัปโหลดซ้ำ ระบบแทนที่รูปหน้าปกเดิม
```

### TC-017 Owner Create Room

Request:

```txt
POST /api/owner/dormitories/{{dormitoryId}}/rooms
Authorization: Bearer {{ownerToken}}
Content-Type: application/json
```

Body:

```json
{
  "roomNumber": "A101",
  "roomType": "standard",
  "price": 3500,
  "availableCount": 3,
  "status": "available",
  "availableFrom": "2026-06-01",
  "facilities": ["bed", "fan", "wardrobe", "wifi"]
}
```

Expected:

```txt
201 Created
response.id มีค่า
```

Save:

```txt
roomId = response.id
```

### TC-018 Owner Update Room

Request:

```txt
PATCH /api/owner/rooms/{{roomId}}
Authorization: Bearer {{ownerToken}}
Content-Type: application/json
```

Body:

```json
{
  "price": 3600,
  "availableCount": 2
}
```

Expected:

```txt
200 OK
message = "อัปเดตห้องพักแล้ว"
```

### TC-019 Upload Room Sample Images

Request:

```txt
POST /api/owner/rooms/{{roomId}}/images
Authorization: Bearer {{ownerToken}}
Content-Type: multipart/form-data
```

Form Data:

```txt
roomImages = image1
roomImages = image2
roomImages = image3
```

Expected:

```txt
201 Created
images.length = 3
ทุก image.url เป็น Cloudinary URL
```

### TC-020 Upload More Than 5 Room Images

Request:

```txt
POST /api/owner/rooms/{{roomId}}/images
Authorization: Bearer {{ownerToken}}
Content-Type: multipart/form-data
```

Form Data: เพิ่มจำนวนรูปให้รวมกับของเดิมเกิน 5 รูป

Expected:

```txt
400 Bad Request
message = "รูปห้องตัวอย่างเพิ่มได้สูงสุด 5 รูป"
```

## 5. Admin Management

### TC-021 Admin List Users

Request:

```txt
GET /api/admin/users
Authorization: Bearer {{adminToken}}
```

Expected:

```txt
200 OK
users เป็น array
มี member และ owner ที่สมัครไว้
```

### TC-022 Admin Count Dormitories

Request:

```txt
GET /api/admin/dormitories/count
Authorization: Bearer {{adminToken}}
```

Expected:

```txt
200 OK
total เป็นจำนวนหอพักทั้งหมดในระบบ
byStatus.pending เป็นจำนวนหอพักที่รออนุมัติ
byStatus.approved เป็นจำนวนหอพักที่อนุมัติแล้ว
byStatus.rejected เป็นจำนวนหอพักที่ถูกปฏิเสธ
byStatus.inactive เป็นจำนวนหอพักที่ปิดใช้งาน
```

Example Response:

```json
{
  "total": 1,
  "byStatus": {
    "pending": 1,
    "approved": 0,
    "rejected": 0,
    "inactive": 0
  }
}
```

### TC-023 Admin Activate Owner

Request:

```txt
PATCH /api/admin/users/{{ownerUserId}}/status
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:

```json
{
  "status": "active"
}
```

Expected:

```txt
200 OK
message = "อัปเดตสถานะผู้ใช้แล้ว"
```

### TC-024 Admin List Pending Dormitories

Request:

```txt
GET /api/admin/dormitories/pending
Authorization: Bearer {{adminToken}}
```

Expected:

```txt
200 OK
dormitories มี dormitoryId จาก TC-013
```

### TC-025 Admin Approve Dormitory

Request:

```txt
PATCH /api/admin/dormitories/{{dormitoryId}}/approve
Authorization: Bearer {{adminToken}}
```

Expected:

```txt
200 OK
message = "อนุมัติหอพักแล้ว"
```

### TC-026 Admin Reject Dormitory

ใช้ทดสอบกับหอพักอีกตัวที่ยัง pending

Request:

```txt
PATCH /api/admin/dormitories/{{anotherDormitoryId}}/reject
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:

```json
{
  "reason": "ข้อมูลไม่ครบถ้วน"
}
```

Expected:

```txt
200 OK
message = "ปฏิเสธหอพักแล้ว"
```

## 6. Public / Member Dormitory Usage

### TC-027 Search Approved Dormitories

Request:

```txt
GET /api/dormitories?search=Just&maxDistance=2&minPrice=3000&maxPrice=4000&roomType=standard
```

Expected:

```txt
200 OK
dormitories มี Just Test Dorm หลังแอดมินอนุมัติแล้ว
```

### TC-028 Get Dormitory Detail

Request:

```txt
GET /api/dormitories/{{dormitoryId}}
```

Expected:

```txt
200 OK
dormitory.id = dormitoryId
rooms มี roomId
rooms[0].images มีรูปจาก TC-019
```

### TC-029 Add Favorite

Request:

```txt
POST /api/favorites/{{dormitoryId}}
Authorization: Bearer {{memberToken}}
```

Expected:

```txt
201 Created
message = "บันทึกรายการโปรดแล้ว"
```

### TC-030 List Favorites

Request:

```txt
GET /api/favorites
Authorization: Bearer {{memberToken}}
```

Expected:

```txt
200 OK
favorites มี dormitoryId
```

### TC-031 Remove Favorite

Request:

```txt
DELETE /api/favorites/{{dormitoryId}}
Authorization: Bearer {{memberToken}}
```

Expected:

```txt
200 OK
message = "ลบรายการโปรดแล้ว"
```

## 7. Booking And Payment

### TC-032 Create Booking

Request:

```txt
POST /api/bookings
Authorization: Bearer {{memberToken}}
Content-Type: application/json
```

Body:

```json
{
  "roomId": 1,
  "moveInDate": "2026-06-15",
  "note": "ต้องการเข้าชมห้องก่อนย้ายเข้า"
}
```

Expected:

```txt
201 Created
bookingId มีค่า
```

Save:

```txt
bookingId = response.bookingId
```

หมายเหตุ: เปลี่ยน `roomId` ให้เป็นค่าจริงจาก TC-017

### TC-033 List My Bookings

Request:

```txt
GET /api/bookings
Authorization: Bearer {{memberToken}}
```

Expected:

```txt
200 OK
bookings มี bookingId
payment_status = "pending"
qr_code_url มีค่า
```

### TC-034 Submit Payment Slip

Request:

```txt
POST /api/bookings/{{bookingId}}/payment-slip
Authorization: Bearer {{memberToken}}
Content-Type: application/json
```

Body:

```json
{
  "slipImageUrl": "https://res.cloudinary.com/example/image/upload/slip.jpg"
}
```

Expected:

```txt
200 OK
message = "ส่งหลักฐานการชำระเงินแล้ว"
```

### TC-035 Admin List Bookings

Request:

```txt
GET /api/admin/bookings
Authorization: Bearer {{adminToken}}
```

Expected:

```txt
200 OK
bookings มี bookingId
payment_status = "submitted"
```

### TC-036 Admin Verify Payment

Request:

```txt
PATCH /api/admin/bookings/{{bookingId}}/payment
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:

```json
{
  "status": "verified"
}
```

Expected:

```txt
200 OK
message = "อัปเดตการชำระเงินแล้ว"
booking status เปลี่ยนเป็น paid
```

### TC-037 Owner List Bookings

Request:

```txt
GET /api/owner/bookings
Authorization: Bearer {{ownerToken}}
```

Expected:

```txt
200 OK
bookings มี bookingId
```

## 8. Review

### TC-038 Create Review

Request:

```txt
POST /api/dormitories/{{dormitoryId}}/reviews
Authorization: Bearer {{memberToken}}
Content-Type: application/json
```

Body:

```json
{
  "rating": 5,
  "comment": "หอพักสะอาด เดินทางสะดวก"
}
```

Expected:

```txt
201 Created
message = "เพิ่มรีวิวแล้ว"
```

Save:

```txt
reviewId = review id จากฐานข้อมูล หรือจากรายการ review ใน GET /api/dormitories/{{dormitoryId}}
```

### TC-039 Owner Reply Review

Request:

```txt
POST /api/owner/reviews/{{reviewId}}/reply
Authorization: Bearer {{ownerToken}}
Content-Type: application/json
```

Body:

```json
{
  "reply": "ขอบคุณสำหรับรีวิวค่ะ"
}
```

Expected:

```txt
200 OK
message = "ตอบรีวิวแล้ว"
```

### TC-040 Admin Hide Review

Request:

```txt
PATCH /api/admin/reviews/{{reviewId}}/hide
Authorization: Bearer {{adminToken}}
```

Expected:

```txt
200 OK
message = "ซ่อนรีวิวแล้ว"
```

## 9. Maintenance Request

### TC-041 Create Maintenance Request

Request:

```txt
POST /api/maintenance-requests
Authorization: Bearer {{memberToken}}
Content-Type: application/json
```

Body:

```json
{
  "roomId": 1,
  "title": "ไฟห้องน้ำเสีย",
  "description": "ไฟห้องน้ำเปิดไม่ติด"
}
```

Expected:

```txt
201 Created
id มีค่า
message = "แจ้งซ่อมเรียบร้อย"
```

หมายเหตุ: เปลี่ยน `roomId` ให้เป็นค่าจริงจาก TC-017

## 10. Authorization Negative Cases

### TC-042 Call Protected API Without Token

Request:

```txt
GET /api/favorites
```

Expected:

```txt
401 Unauthorized
message = "กรุณาเข้าสู่ระบบ"
```

### TC-043 Member Calls Owner API

Request:

```txt
GET /api/owner/dormitories
Authorization: Bearer {{memberToken}}
```

Expected:

```txt
403 Forbidden
message = "ไม่มีสิทธิ์ใช้งานส่วนนี้"
```

### TC-044 Owner Calls Admin API

Request:

```txt
GET /api/admin/users
Authorization: Bearer {{ownerToken}}
```

Expected:

```txt
403 Forbidden
message = "ไม่มีสิทธิ์ใช้งานส่วนนี้"
```

### TC-045 Not Found API

Request:

```txt
GET /api/not-found
```

Expected:

```txt
404 Not Found
message = "ไม่พบ API ที่เรียกใช้งาน"
```

## ลำดับทดสอบที่แนะนำ

1. TC-001 ถึง TC-010
2. TC-013 ถึง TC-019
3. TC-021 ถึง TC-025
4. TC-027 ถึง TC-041
5. TC-042 ถึง TC-045
