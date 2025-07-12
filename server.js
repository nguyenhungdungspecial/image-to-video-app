const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Cấu hình multer để lưu ảnh
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Route tạo video từ danh sách ảnh cụ thể
app.post('/create-video', upload.array('images'), async (req, res) => {
  const files = req.files;
  const description = req.body.description || '';

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Không có ảnh nào được tải lên.' });
  }

  const timestamp = Date.now();
  const outputPath = path.join(uploadsDir, `output_${timestamp}.mp4`);
  const listPath = path.join(uploadsDir, `list_${timestamp}.txt`);

  // Ghi danh sách ảnh vào file text
  const imageList = files.map(file => `file '${path.resolve(file.path)}'`).join('\n');
  fs.writeFileSync(listPath, imageList);

  // FFmpeg tạo video từ danh sách ảnh
  const cmd = `ffmpeg -f concat -safe 0 -i "${listPath}" -vsync vfr -pix_fmt yuv420p "${outputPath}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ FFmpeg error:', error);
      return res.status(500).json({ error: 'Không thể tạo video.' });
    }

    const videoUrl = `https://${req.headers.host}/uploads/${path.basename(outputPath)}`;
    return res.json({ videoUrl });
  });
});

// Cho phép truy cập video
app.use('/uploads', express.static(uploadsDir));

// ✅ Khởi động server
app.listen(port, () => {
  console.log(`✅ Server đang chạy tại cổng ${port}`);
});
