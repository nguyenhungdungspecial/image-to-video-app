import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
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
      Alert.alert('⚠️ Lỗi', 'Vui lòng chọn ít nhất một hình ảnh.');
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
      Alert.alert('🔄 Đang gửi yêu cầu', 'Đang tạo video...');

      const response = await axios.post(
        'https://image-to-video-server-a5ci.onrender.com/create-video',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      Alert.alert('✅ Thành công', `Video: ${response.data.videoUrl}`);
      setVideoUri(response.data.videoUrl);
    } catch (error: any) {
      console.error('❌ Lỗi tạo video:', error);
      Alert.alert(
        '❌ Lỗi',
        `Gửi request thất bại: ${error?.message || 'Không rõ lỗi'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const saveVideo = async () => {
    if (!videoUri) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('⚠️ Lỗi', 'Không có quyền lưu video.');
      return;
    }

    try {
      const asset = await MediaLibrary.createAssetAsync(videoUri);
      await MediaLibrary.createAlbumAsync('Download', asset, false);
      Alert.alert('✅ Thành công', 'Video đã được lưu vào máy.');
    } catch (error: any) {
      Alert.alert('❌ Lỗi', `Không thể lưu video: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Button title="📷 Chọn ảnh" onPress={pickImages} />
      <TextInput
        placeholder="Nhập mô tả"
        value={description}
        onChangeText={setDescription}
        style={{
          borderColor: '#ccc',
          borderWidth: 1,
          padding: 10,
          marginTop: 10,
        }}
      />
      <Button
        title="🎬 Tạo video"
        onPress={createVideo}
        disabled={loading}
        color="green"
      />
      {loading && <ActivityIndicator size="large" color="blue" />}

      {videoUri ? (
        <>
          <Text style={{ marginTop: 20 }}>🎞 Xem video:</Text>
          <Video
            source={{ uri: videoUri }}
            useNativeControls
            resizeMode="contain"
            style={{ width: '100%', height: 200 }}
          />
          <Button title="💾 Lưu video" onPress={saveVideo} />
        </>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
        {images.map((uri, index) => (
          <Image
            key={index}
            source={{ uri }}
            style={{ width: 100, height: 100, marginRight: 10, marginBottom: 10 }}
          />
        ))}
      </View>
    </ScrollView>
  );
}
