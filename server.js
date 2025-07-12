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

// Multer cấu hình để lưu ảnh
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Route tạo video — phải có
app.post('/create-video', upload.array('images'), async (req, res) => {
  const files = req.files;
  const description = req.body.description || '';

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Không có ảnh nào được tải lên.' });
  }

  const outputPath = `uploads/output_${Date.now()}.mp4`;

  // Giả sử bạn có lệnh ffmpeg tạo video ở đây
  const cmd = `ffmpeg -framerate 1 -i uploads/%*.jpg -c:v libx264 -r 30 -pix_fmt yuv420p ${outputPath}`;

  exec(cmd, (error) => {
    if (error) {
      console.error('FFmpeg error:', error);
      return res.status(500).json({ error: 'Không thể tạo video.' });
    }

    return res.json({
      videoUrl: `https://${req.headers.host}/${outputPath}`,
    });
  });
});

// Cho phép truy cập thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
