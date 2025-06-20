import { View, Button, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import React, { useState } from 'react';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setVideoUri(null);
    }
  };

  const uploadImage = async () => {
    if (!image) return;

    setUploading(true);
    const apiUrl = 'https://image-to-video-server-a5ci.onrender.com/api/upload';

    const formData = new FormData();
    formData.append('image', {
      uri: image,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      if (data.videoUrl) {
        setVideoUri(data.videoUrl);
        Alert.alert('Video created', 'Nhấn để xem hoặc lưu về máy.');
      } else {
        Alert.alert('Error', 'Server không trả về video');
      }
    } catch (error: any) {
      Alert.alert('Upload failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveVideo = async () => {
    if (!videoUri) return;
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Không thể lưu video nếu không cấp quyền');
      return;
    }

    const fileUri = FileSystem.documentDirectory + 'video.mp4';
    const downloadResumable = FileSystem.createDownloadResumable(videoUri, fileUri);
    const { uri } = await downloadResumable.downloadAsync();
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('Đã lưu', 'Video đã lưu vào thư viện');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button title="Chọn ảnh" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={{ width: '100%', height: 300, marginVertical: 10 }} />}
      {image && <Button title="Gửi ảnh & Tạo video" onPress={uploadImage} />}
      {uploading && <ActivityIndicator size="large" color="#0000ff" />}
      {videoUri && (
        <>
          <Video
            source={{ uri: videoUri }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="contain"
            shouldPlay
            useNativeControls
            style={{ width: '100%', height: 300, marginVertical: 10 }}
          />
          <Button title="Lưu video về máy" onPress={saveVideo} />
        </>
      )}
    </View>
  );
      }
