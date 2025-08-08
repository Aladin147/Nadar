import React, { useMemo, useRef, useState } from 'react';
import { Button, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { describe, ocr, qa, tts } from '../api/client';
import { base64ToUint8Array, pcm16ToWavBytes } from '../utils/pcmToWav';

export default function MainScreen() {
  const [mode, setMode] = useState<'scene'|'ocr'|'qa'>('scene');
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
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

  async function run() {
    if (!image) return;
    setBusy(true); setText('');
    const [, b64] = image.split(',');

    try {
      let result;
      if (mode === 'scene') result = await describe(b64);
      else if (mode === 'ocr') result = await ocr(b64);
      else {
        if (!question.trim()) throw new Error('Please enter a question for Q&A');
        result = await qa(b64, question.trim());
      }
      setText(result.text);
    } catch (e: any) {
      setText(`Error: ${e?.message || 'unknown'}`);
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
        <View style={styles.modes}>
          {(['scene','ocr','qa'] as const).map(m => (
            <TouchableOpacity key={m} style={[styles.mode, mode===m && styles.modeActive]} onPress={()=>setMode(m)}>
              <Text style={styles.modeText}>{m.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        {!!text && (
          <View style={{ marginTop: 14 }}>
            <Text selectable style={styles.output}>{text}</Text>
            <Button title="Play Audio" onPress={playTTS} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12 },
  modes: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mode: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#333' },
  modeActive: { backgroundColor: '#6c63ff' },
  modeText: { color: '#fff', fontWeight: '600' },
  output: { color: '#fff', backgroundColor: '#222', padding: 10, borderRadius: 8 },
});

