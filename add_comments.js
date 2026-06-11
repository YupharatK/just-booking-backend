const fs = require('fs');
const file = '/Users/yupharat/just-booking-backend/controllers/userController.js';
let content = fs.readFileSync(file, 'utf8');

const comments = {
  'updateProfile': '// ฟังก์ชันสำหรับอัปเดตข้อมูลโปรไฟล์ของผู้ใช้งาน (เช่น ชื่อ, เบอร์โทร, ที่อยู่, รหัสผ่าน) ลงในฐานข้อมูล',
  'listDormitories': '// ฟังก์ชันสำหรับดึงรายการหอพักทั้งหมด โดยรองรับการค้นหาและกรองข้อมูล (ราคา, ระยะทาง, ประเภทห้อง)',
  'getDormitory': '// ฟังก์ชันสำหรับดึงรายละเอียดแบบเจาะลึกของหอพัก 1 แห่ง รวมถึงข้อมูลห้องพัก รูปภาพ และรีวิวทั้งหมด',
  'addFavorite': '// ฟังก์ชันสำหรับเพิ่มหอพักลงในรายการโปรด (Favorites) ของผู้ใช้งาน',
  'removeFavorite': '// ฟังก์ชันสำหรับลบหอพักออกจากรายการโปรดของผู้ใช้งาน',
  'listFavorites': '// ฟังก์ชันสำหรับดึงข้อมูลรายการหอพักทั้งหมดที่ผู้ใช้งานกดชื่นชอบไว้',
  'createBooking': '// ฟังก์ชันสำหรับสร้างคำขอจองห้องพัก โดยจะเช็คว่าห้องว่างหรือไม่ และลดจำนวนห้องว่างลง 1 ห้อง',
  'listMyBookings': '// ฟังก์ชันสำหรับดึงประวัติการจองทั้งหมดของผู้ใช้งาน พร้อมสถานะการชำระเงินและรายละเอียดหอพัก',
  'submitPaymentSlip': '// ฟังก์ชันสำหรับอัปโหลดสลิปโอนเงินขึ้น Cloudinary และอัปเดตสถานะการชำระเงินในฐานข้อมูล',
  'createReview': '// ฟังก์ชันสำหรับบันทึกการให้คะแนน (Rating) และความคิดเห็น (Review) ของผู้ใช้งานต่อหอพัก',
  'createMaintenanceRequest': '// ฟังก์ชันสำหรับสร้างคำขอแจ้งซ่อมสิ่งของหรือปัญหาภายในห้องพัก'
};

for (const [funcName, comment] of Object.entries(comments)) {
  const regex = new RegExp(`async function ${funcName}\\(`, 'g');
  if (content.match(regex)) {
    content = content.replace(regex, `${comment}\nasync function ${funcName}(`);
  }
}

fs.writeFileSync(file, content);
console.log('Comments added to userController.js');
