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
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Cấu hình lưu ảnh với multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Route tạo video
app.post('/create-video', upload.array('images'), async (req, res) => {
  const files = req.files;
  const description = req.body.description || '';

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Không có ảnh nào được tải lên.' });
  }

  const timestamp = Date.now();
  const listPathFile = `uploads/list_${timestamp}.txt`;
  const outputPath = `uploads/output_${timestamp}.mp4`;

  // Tạo file danh sách ảnh cho ffmpeg
  const fileList = files.map(file => `file '${path.resolve(file.path)}'`).join('\n');
  fs.writeFileSync(listPathFile, fileList);

  // Lệnh ffmpeg sử dụng danh sách file
  const cmd = `ffmpeg -f concat -safe 0 -i ${listPathFile} -vsync vfr -pix_fmt yuv420p -r 1 ${outputPath}`;

  exec(cmd, (error) => {
    if (error) {
      console.error('❌ FFmpeg error:', error);
      return res.status(500).json({ error: 'Không thể tạo video.' });
    }

    return res.json({
      videoUrl: `https://${req.headers.host}/${outputPath}`,
    });
  });
});

// ✅ Cho phép truy cập thư mục uploads để tải video
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Khởi động server
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
