import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Button,
  Image,
  Dimensions,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av'; // Dùng expo-av cho Video
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Slider from '@react-native-community/slider'; // Thanh trượt thời gian

// LƯU Ý QUAN TRỌNG: Thay thế URL này bằng URL Render của server của bạn
const SERVER_URL = 'https://image-to-video-server-a5ci.onrender.com';

const { width } = Dimensions.get('window');
const VIDEO_FRAME_WIDTH = width * 0.95; // Chiếm 95% chiều ngang màn hình
const VIDEO_FRAME_HEIGHT = VIDEO_FRAME_WIDTH * 0.7; // Chiều cao bằng 70% chiều ngang

export default function App() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef(null);

  // Yêu cầu quyền truy cập thư viện ảnh/video khi ứng dụng khởi động
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập vào thư viện ảnh để lưu video.');
        }
      }
    })();
  }, []);

  const pickImages = async () => {
    setVideoUrl(null); // Reset video khi chọn ảnh mới
    setSelectedImages([]); // Xóa ảnh cũ
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // Cho phép chọn nhiều ảnh
      quality: 1,
    });

    if (!result.canceled) {
      // Lấy URI từ mảng assets
      const uris = result.assets.map(asset => asset.uri);
      setSelectedImages(uris);
    }
  };

  const createVideo = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một ảnh để tạo video.');
      return;
    }

    setLoading(true);
    setVideoUrl(null); // Reset video URL trước khi tạo mới

    const formData = new FormData();
    selectedImages.forEach((uri, index) => {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('images', { uri, name: filename, type });
    });
    formData.append('description', description);

    try {
      const response = await fetch(`${SERVER_URL}/create-video`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data', // Quan trọng cho FormData
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Video đã được tạo!');
        console.log('Video URL:', data.videoUrl);
        setVideoUrl(data.videoUrl);
      } else {
        Alert.alert('Lỗi', data.error || 'Không thể tạo video.');
      }
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu tạo video:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi mạng hoặc lỗi server.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setVideoProgress(status.positionMillis);
      setVideoDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
    }
    if (status.didJustFinish) {
      setIsPlaying(false);
      setVideoProgress(0); // Reset về đầu khi kết thúc
      videoRef.current.replayAsync(); // Tùy chọn: tự động phát lại
    }
  };

  const handleSeek = async (value) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(value);
      setVideoProgress(value);
    }
  };

  const saveVideoToDevice = async () => {
    if (!videoUrl) {
      Alert.alert('Lỗi', 'Không có video để lưu.');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert('Thông báo', 'Tính năng lưu video về thiết bị không khả dụng trên nền web.');
      return;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập vào thư viện ảnh để lưu video.');
      return;
    }

    setIsSaving(true);
    try {
      const fileUri = FileSystem.documentDirectory + `video_${Date.now()}.mp4`;
      const { uri: downloadedUri } = await FileSystem.downloadAsync(videoUrl, fileUri);

      const asset = await MediaLibrary.createAssetAsync(downloadedUri);
      if (asset) {
        Alert.alert('Thành công', 'Video đã được lưu vào thư viện!');
      } else {
        Alert.alert('Lỗi', 'Không thể lưu video vào thư viện.');
      }
    } catch (error) {
      console.error('Lỗi khi lưu video:', error);
      Alert.alert('Lỗi', `Đã xảy ra lỗi khi lưu video: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tạo Video từ Ảnh</Text>

      {/* Khung Ảnh/Video lớn */}
      <View style={styles.mediaFrame}>
        {loading && <ActivityIndicator size="large" color="#0000ff" />}
        {videoUrl ? (
          <Video
            ref={videoRef}
            style={styles.videoPlayer}
            source={{ uri: videoUrl }}
            useNativeControls={false} // Tắt điều khiển gốc để dùng điều khiển tùy chỉnh
            resizeMode="contain"
            isLooping
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        ) : selectedImages.length > 0 ? (
          <Image source={{ uri: selectedImages[0] }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.placeholderText}>Chưa có ảnh/video nào</Text>
        )}
      </View>

      {/* Nút Chọn Ảnh */}
      <TouchableOpacity style={styles.button} onPress={pickImages} disabled={loading}>
        <Text style={styles.buttonText}>Chọn Ảnh</Text>
      </TouchableOpacity>

      {/* Trường mô tả */}
      <TextInput
        style={[styles.descriptionInput, { height: Math.max(35, description.length > 0 ? (description.split('\n').length * 20) : 35) }]} // Tự động mở rộng
        placeholder="Mô tả nội dung chuyển động của video..."
        multiline
        value={description}
        onChangeText={setDescription}
        editable={!loading}
      />

      {/* Nút Tạo Video */}
      <TouchableOpacity style={styles.button} onPress={createVideo} disabled={loading || selectedImages.length === 0}>
        <Text style={styles.buttonText}>{loading ? 'Đang tạo video...' : 'Tạo Video'}</Text>
      </TouchableOpacity>

      {/* Phần điều khiển video (chỉ hiển thị khi có video) */}
      {videoUrl && (
        <View style={styles.videoControlsContainer}>
          {/* Nút Play/Stop */}
          <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
            <Text style={styles.playPauseButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>

          {/* Thanh thời lượng video */}
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={videoDuration}
            value={videoProgress}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#FF0000" // Màu đỏ giống YouTube
            maximumTrackTintColor="#FFFFFF"
            thumbTintColor="#FF0000"
          />
          <Text style={styles.timeText}>{`${formatTime(videoProgress)} / ${formatTime(videoDuration)}`}</Text>
        </View>
      )}

      {/* Nút Lưu Video */}
      {videoUrl && (
        <TouchableOpacity style={styles.saveButton} onPress={saveVideoToDevice} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Đang lưu...' : 'Lưu Video'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  mediaFrame: {
    width: VIDEO_FRAME_WIDTH,
    height: VIDEO_FRAME_HEIGHT,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden', // Quan trọng để ảnh/video không tràn ra ngoài
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 15,
    width: '95%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  descriptionInput: {
    width: '95%',
    minHeight: 35, // Chiều cao tối thiểu
    maxHeight: 150, // Chiều cao tối đa, có thể cuộn nếu vượt quá
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 20, // Khoảng cách dòng cho TextInput multiline
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  videoControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '95%',
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  playPauseButton: {
    backgroundColor: '#FF0000', // Màu đỏ giống YouTube
    padding: 10,
    borderRadius: 5,
    width: 50,
    alignItems: 'center',
  },
  playPauseButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  progressSlider: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#28a745', // Màu xanh lá cây
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
    width: '95%',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

