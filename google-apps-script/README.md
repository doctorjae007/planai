# เชื่อม Google Sheets กับ KruPlan AI

1. สร้าง Google Sheet ใหม่ แล้วเปิด **ส่วนขยาย > Apps Script**
2. วางโค้ดจาก `Code.gs` และกดรัน `setupKruPlanSheets` หนึ่งครั้ง
3. เลือก **Deploy > New deployment > Web app**
4. ตั้ง Execute as เป็นเจ้าของไฟล์ และกำหนดสิทธิ์เข้าถึงตามการใช้งานของโรงเรียน
5. คัดลอก Web app URL ไปใส่ในไฟล์ `.env.local`:

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

จากนั้นหยุดและเปิด `npm run dev` ใหม่ ข้อมูลภาคเรียนที่สร้างจะถูกเพิ่มลงชีต `Semesters`
