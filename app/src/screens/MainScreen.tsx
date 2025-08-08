import React, { useMemo, useRef, useState } from 'react';
import { Button, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Segmented } from '../app/components/Segmented';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { theme } from '../app/theme';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { describe, ocr, qa, tts } from '../api/client';
import { base64ToUint8Array, pcm16ToWavBytes } from '../utils/pcmToWav';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { downscale } from '../utils/downscale';
import { CaptureButton } from '../components/CaptureButton';

export default function MainScreen() {
  const [mode, setMode] = useState<'scene'|'ocr'|'qa'>('scene');
  const [perm, requestPerm] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<any>(null);

  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [timings, setTimings] = useState<{ prep: number; model: number; total: number } | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });
    if (!res.canceled && res.assets?.length) {
      const a = res.assets[0];
      const base64 = a.base64 || await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = a.mimeType || 'image/jpeg';
      setImage(`data:${mime};base64,${base64}`);
    }
  }

  async function openCamera() {
    if (!perm?.granted) {
      const r = await requestPerm();
      if (!r.granted) return;
    }
    setShowCamera(true);
  }

  async function onCapture(uri: string) {
    setShowCamera(false);
    const ds = await downscale(uri, 1024, 0.8);
    setImage(`data:${ds.mimeType};base64,${ds.base64}`);
  }

  async function run() {
    if (!image) return;
    setBusy(true); setText(''); setTimings(null);
    const t0 = Date.now();
    const [, b64] = image.split(',');
    const t1 = Date.now();

    try {
      let result;
      const mime = image.split(';')[0].replace('data:', '') || 'image/jpeg';
      if (mode === 'scene') result = await describe(b64, mime);
      else if (mode === 'ocr') result = await ocr(b64, mime);
      else {
        if (!question.trim()) throw new Error('Please enter a question for Q&A');
        result = await qa(b64, question.trim(), mime);
      }
      const t2 = Date.now();
      setText(result.text);
      setTimings({ prep: t1 - t0, model: (result.timings?.modelMs || 0), total: t2 - t0 });
    } catch (e: any) {
      setText(`Error: ${e?.message || 'unknown'}`);
      setTimings(null);
    } finally {
      setBusy(false);
    }
  }

  async function playTTS() {
    if (!text) return;
    const res = await tts(text);
    const pcm = base64ToUint8Array(res.audioBase64);
    const wav = pcm16ToWavBytes(pcm);
    const wavPath = FileSystem.cacheDirectory + 'tts.wav';
    await FileSystem.writeAsStringAsync(wavPath, Buffer.from(wav).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
    if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
    const { sound } = await Audio.Sound.createAsync({ uri: wavPath });
    soundRef.current = sound; await sound.playAsync();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Nadar MVP Tester</Text>
        <Segmented options={['scene','ocr','qa']} value={mode} onChange={(v)=>setMode(v as any)} />

        <Button title="Pick Image" onPress={pickImage} />
        {image && <Image source={{ uri: image }} style={{ width: '100%', height: 200, marginTop: 10, borderRadius: 8 }} resizeMode="cover" />}

        {mode==='qa' && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: '#ccc', marginBottom: 6 }}>Question:</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask about the image…"
              placeholderTextColor="#888"
              style={{ backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 8 }}
            />
          </View>
        )}

        <View style={{ marginTop: 10 }}>
          <Button title={busy ? 'Working…' : 'Run'} onPress={run} disabled={!image || busy} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Button title="Pick Image" onPress={pickImage} />
          <CaptureButton title="Open Camera" onPress={openCamera} />
        </View>

        {showCamera && (
          <View style={{ height: 360, marginTop: 10, borderRadius: 12, overflow: 'hidden' }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
              <View style={{ position: 'absolute', bottom: 16, alignSelf: 'center' }}>
                <CaptureButton title="Capture" onPress={async ()=>{
                  if (cameraRef.current) {
                    const photo = await cameraRef.current.takePictureAsync({ base64: true });
                    await onCapture(photo.uri);
                  }
                }} />
              </View>
            </CameraView>
          </View>
        )}

        {!!text && (
          <View style={{ marginTop: 20 }}>
            <Text selectable style={styles.output}>{text}</Text>
            {timings && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                <Text style={styles.timing}>Prep: {timings.prep}ms</Text>
                <Text style={styles.timing}>Model: {timings.model}ms</Text>
                <Text style={styles.timing}>Total: {timings.total}ms</Text>
              </View>
            )}
            <View style={{ marginTop: 12 }}>
              <CaptureButton title="🔊 Play Audio" onPress={playTTS} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { padding: theme.spacing(2) },
  title: { ...theme.typography.title, color: theme.colors.text, marginBottom: theme.spacing(2), textAlign: 'center' },
  modes: { flexDirection: 'row', gap: 12, marginBottom: 20, justifyContent: 'center' },
  mode: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modeActive: {
    backgroundColor: '#6366f1',
    borderColor: '#8b5cf6',
    shadowColor: '#6366f1',
    shadowOpacity: 0.4,
  },
  modeText: { color: '#fff', fontWeight: '700', fontSize: 14, textTransform: 'uppercase' },
  output: {
    color: '#e5e5e5',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
    lineHeight: 24,
  },
  timing: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});

