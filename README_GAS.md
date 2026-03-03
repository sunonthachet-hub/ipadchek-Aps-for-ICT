# การติดตั้ง Google Apps Script (Backend)

เพื่อให้ระบบสามารถบันทึกข้อมูลลงใน Google Sheets ได้จริง ให้ทำตามขั้นตอนดังนี้:

### 1. เตรียม Google Sheets
1. สร้าง Google Sheets ใหม่
2. สร้าง Sheet ย่อย (Tabs) ทั้งหมด 7 ชื่อดังนี้:

- **Users** (สิทธิ์การเข้าใช้งาน)
  - `id`, `loginId`, `password`, `role`
- **Students** (ข้อมูลนักเรียน)
  - `studentId`, `fullName`, `grade`, `classroom`, `email`, `notes`
- **Teachers** (ข้อมูลครู)
  - `teacherId`, `fullName`, `department`, `email`
- **Categories** (ข้อมูลประเภทสินค้า - Master Data)
  - `categoryId`, `name`, `description`, `designatedFor`, `imageUrl`
- **Products** (รายการอุปกรณ์รายชิ้น)
  - `productId`, `categoryId`, `status`, `isFeatured`, `notes`
- **Transactions** (ประวัติการยืม-คืน)
  - `id`, `productId`, `borrowerId`, `borrowerType`, `borrowDate`, `dueDate`, `returnDate`, `status`
- **Maintenance** (ประวัติการซ่อม)
  - `id`, `productId`, `issue`, `reportDate`, `status`

### 2. ติดตั้ง Code.gs
1. ใน Google Sheets ไปที่เมนู **Extensions (ส่วนขยาย)** > **Apps Script**
2. คัดลอกเนื้อหาจากไฟล์ `code.gs` ในโปรเจกต์นี้ไปวางแทนที่โค้ดเดิมใน Apps Script
3. กดปุ่ม **Deploy (ทำให้ใช้งานได้)** > **New Deployment (การทำให้ใช้งานได้ใหม่)**
4. เลือกประเภทเป็น **Web App (แอปเว็บ)**
5. ตั้งค่าดังนี้:
   - **Execute as (เรียกใช้ในฐานะ):** Me (ฉัน)
   - **Who has access (ผู้ที่มีสิทธิ์เข้าถึง):** Anyone (ทุกคน)
6. กด **Deploy** และคัดลอก **Web App URL** ที่ได้มา

### 3. เชื่อมต่อกับเว็บไซต์
1. นำ URL ที่ได้จากขั้นตอนที่แล้ว มาใส่ใน **Secrets** ของ AI Studio
2. ตั้งชื่อ Key ว่า `VITE_API_URL` และใส่ URL เป็น Value
3. รีสตาร์ทแอปพลิเคชัน

---
*หมายเหตุ: หากยังไม่ได้ตั้งค่า VITE_API_URL ระบบจะใช้งานข้อมูลจำลอง (Mock Data) แทน*
