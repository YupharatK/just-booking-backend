require('dotenv').config();
const { uploadSecureBuffer } = require('./config/cloudinary');
const fs = require('fs');

async function test() {
  try {
    const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Count 0\n/Kids []\n>>\nendobj\ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\n%%EOF', 'utf-8');
    const result = await uploadSecureBuffer(buffer, 'just-booking/test', 'raw');
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
