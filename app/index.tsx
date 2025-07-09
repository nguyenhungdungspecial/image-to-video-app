import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Video } from 'expo-av';

export default function HomeScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [videoUri, setVideoUri] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages(uris);
    }
  };

  const createVideo = async () => {
    if (images.length === 0) {
      Alert.alert('Vui lòng chọn ít nhất một hình ảnh.');
      return;
    }

    setLoading(true);
    const formData = new FormData();

    images.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const type = 'image/jpeg';
      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    });

    formData.append('description', description);

    try {
      const response = await axios.post(
        'https://image-to-video-server.onrender.com/create-video',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setVideoUri(response.data.videoUrl);
      Alert.alert('Thành công', 'Video đã được tạo!');
    } catch (error: any) {
      console.error('Lỗi tạo video:', error);
      Alert.alert('Lỗi', error.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const saveVideo = async () => {
    if (!videoUri) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Không có quyền truy cập thư viện');
      return;
    }

    try {
      await MediaLibrary.saveToLibraryAsync(videoUri);
      Alert.alert('Đã lưu video vào thư viện');
    } catch (error) {
      Alert.alert('Lỗi khi lưu video');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎬 Image to Video App</Text>

      <TouchableOpacity style={styles.button} onPress={pickImages} disabled={loading}>
        <Text style={styles.buttonText}>📷 Chọn hình ảnh</Text>
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        {images.map((uri, idx) => (
          <Image key={idx} source={{ uri }} style={styles.largeImage} />
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Mô tả hành động..."
        value={description}
        onChangeText={setDescription}
        editable={!loading}
      />

      <TouchableOpacity style={styles.button} onPress={createVideo} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🚀 Tạo video</Text>
        )}
      </TouchableOpacity>

      {videoUri && (
        <>
          <Video
            source={{ uri: videoUri }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.button} onPress={saveVideo}>
            <Text style={styles.buttonText}>⬇️ Tải video</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#f0f4f7',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    width: '100%',
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    marginTop: 10,
  },
  largeImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    borderRadius: 12,
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 300,
    marginTop: 20,
    backgroundColor: '#000',
    borderRadius: 10,
  },
});
