import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
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

    // ✅ Log thông tin trước khi gửi
    console.log('🟡 Sending request to server...');
    console.log('🖼️ Images:', images);
    console.log('📝 Description:', description);

    try {
      const response = await axios.post(
        'https://image-to-video-server-a5ci.onrender.com/create-video',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Response:', response.data);

      setVideoUri(response.data.videoUrl);
      Alert.alert('Thành công', 'Video đã được tạo!');
    } catch (error: any) {
      console.error('❌ Lỗi tạo video:', {
        message: error?.message,
        response: error?.response?.data,
        full: error?.toJSON?.() || error,
      });
      Alert.alert('Lỗi', error?.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const saveVideo = async () => {
    if (!videoUri) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Không có quyền lưu video');
      return;
    }

    const asset = await MediaLibrary.createAssetAsync(videoUri);
    await MediaLibrary.createAlbumAsync('Videos', asset, false);
    Alert.alert('Đã lưu video vào thư viện!');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImages}>
        <Text style={styles.buttonText}>📸 CHỌN ẢNH</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nhập mô tả..."
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.buttonGreen} onPress={createVideo}>
        <Text style={styles.buttonText}>🎬 TẠO VIDEO</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {images.length > 0 && (
        <View style={styles.preview}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.image} />
          ))}
        </View>
      )}

      {videoUri !== '' && (
        <>
          <Video
            source={{ uri: videoUri }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="contain"
            shouldPlay
            useNativeControls
            style={styles.video}
          />
          <Button title="💾 Lưu video vào máy" onPress={saveVideo} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
  },
  buttonGreen: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    width: '100%',
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
    backgroundColor: 'white',
  },
  preview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  image: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
  },
  video: {
    width: '100%',
    height: 200,
    marginTop: 20,
    borderRadius: 8,
  },
});
