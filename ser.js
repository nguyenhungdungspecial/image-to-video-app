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

// Multer cấu hình để lưu ảnh
const storage = multer.diskStorage({
  destination: 'uploads/',
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
  const outputVideo = `uploads/output_${timestamp}.mp4`;
  const inputTxt = `uploads/input_${timestamp}.txt`;

  // Tạo danh sách file input cho ffmpeg
  const fileList = files.map(file => `file '${file.path}'`).join('\n');
  fs.writeFileSync(inputTxt, fileList);

  const cmd = `ffmpeg -f concat -safe 0 -i ${inputTxt} -vsync vfr -pix_fmt yuv420p ${outputVideo}`;

  exec(cmd, (err) => {
    if (err) {
      console.error('❌ FFmpeg lỗi:', err);
      return res.status(500).json({ error: 'Không thể tạo video.' });
    }

    console.log('✅ Tạo video thành công:', outputVideo);
    return res.json({
      videoUrl: `https://${req.headers.host}/${outputVideo}`,
    });
  });
});

// Cho phép truy cập thư mục uploads qua URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
