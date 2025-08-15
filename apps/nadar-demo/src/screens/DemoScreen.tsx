import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { theme } from "../theme";
import { assist, assistWithImageRef, assistMultimodal, ocr, testConnection, tts, postJSON } from "../api/client";
import { downscale } from "../utils/downscale";
import { AudioPlayer, AudioPlayerRef } from "../utils/audioPlayer";
import { audioRecorder } from "../utils/audioRecording";

interface AssistResponse {
  speak: string;
  details?: string[];
  signals: {
    has_text: boolean;
    hazards: string[];
    people_count: number;
    lighting_ok: boolean;
    confidence: number;
  };
  followup_suggest?: string[];
  followupToken?: string;
  timestamp: string;
  sessionId: string;
  processingTime: number;
  fallback?: boolean;
}

interface MultimodalResponse {
  sessionId: string;
  speak: string;
  suggest?: string[];
  tokens_in?: number;
  tokens_out?: number;
  audio_bytes?: number;
  model_ms?: number;
  assist_engine: string;
}

export default function DemoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AssistResponse | MultimodalResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'image-only' | 'image-with-audio'>('image-only');
  const cameraRef = useRef<CameraView>(null);
  const audioRef = useRef<AudioPlayerRef['current']>(null);
  const audioPlayer = useRef(new AudioPlayer({ current: null }));

  React.useEffect(() => {
    (async () => {
      const connected = await testConnection();
      setIsConnected(connected);
    })();
  }, []);

  // Update audio player ref when it changes
  React.useEffect(() => {
    audioPlayer.current.updateRef(audioRef.current);
  }, [audioRef.current]);

  // Cleanup audio on unmount
  React.useEffect(() => {
    return () => {
      audioPlayer.current.cleanup();
    };
  }, []);

  const playTTS = async (text: string) => {
    if (!text.trim()) return;

    try {
      setIsPlayingTTS(true);
      console.log("🎵 Playing TTS for:", text.substring(0, 50) + "...");

      const ttsResult = await tts(text, "Kore", "elevenlabs");
      await audioPlayer.current.playAudio(ttsResult.audioBase64, ttsResult.mimeType);

      console.log("✅ TTS playback completed");
    } catch (error) {
      console.error("❌ TTS playback failed:", error);
      // Don't show error to user - TTS failure shouldn't block the demo
    } finally {
      setIsPlayingTTS(false);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      setIsRecording(true);
      await audioRecorder.startRecording();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log("🎤 Started recording audio");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      setIsRecording(false);
      Alert.alert("Error", "Failed to start audio recording. Please check permissions.");
    }
  };

  const stopRecordingAndCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Stop recording and get audio
      const audioUri = await audioRecorder.stopRecording();
      setIsRecording(false);

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image");
      }

      // Process multimodal request
      if (audioUri) {
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        const result = await assistMultimodal(
          photo.base64,
          "image/jpeg",
          audioBase64,
          "audio/wav"
        );

        // Convert multimodal response to standard format for UI compatibility
        const standardResponse: AssistResponse = {
          speak: result.speak,
          details: result.suggest || [],
          signals: {
            has_text: false,
            hazards: [],
            people_count: 0,
            lighting_ok: true,
            confidence: 0.8
          },
          followup_suggest: result.suggest,
          followupToken: result.sessionId,
          timestamp: new Date().toISOString(),
          sessionId: result.sessionId,
          processingTime: result.model_ms || 0,
          fallback: false
        };

        setResponse(standardResponse);
        setShowDetails(false);

        // Auto-play TTS for the main response
        await playTTS(result.speak);
      } else {
        // Fallback to image-only if audio failed
        const result = await assist(photo.base64, "image/jpeg");
        setResponse(result);
        setShowDetails(false);
        await playTTS(result.speak);
      }

    } catch (error) {
      console.error("Multimodal capture error:", error);
      Alert.alert("Error", "Failed to process image and audio. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image");
      }

      const result = await assist(photo.base64, "image/jpeg");
      setResponse(result);
      setShowDetails(false);

      // Auto-play TTS for the main response
      await playTTS(result.speak);
      
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsLoading(true);
        
        const downscaled = await downscale(result.assets[0].uri);
        const assistResult = await assist(downscaled.base64, downscaled.mimeType);
        setResponse(assistResult);
        setShowDetails(false);

        // Auto-play TTS for the main response
        await playTTS(assistResult.speak);
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async (question: string) => {
    if (!response || !response.followupToken) {
      Alert.alert("Error", "No image available for follow-up question. Please take a new photo.");
      return;
    }

    try {
      setIsLoading(true);
      console.log("❓ Follow-up question:", question);
      console.log("🔄 Using followupToken:", response.followupToken);

      // Use the cached image with the follow-up question
      const followUpResult = await assistWithImageRef(
        response.followupToken,
        question,
        { language: 'darija' },
        response.sessionId
      );

      setResponse(followUpResult);
      setShowDetails(false);

      // Auto-play TTS for the follow-up response
      await playTTS(followUpResult.speak);
    } catch (error) {
      console.error("Follow-up error:", error);
      Alert.alert("Error", "Failed to process follow-up question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadAllText = async () => {
    if (!response || !response.followupToken) {
      Alert.alert("Error", "No image available for text extraction. Please take a new photo.");
      return;
    }

    try {
      setIsLoading(true);
      console.log("📄 Reading all text from image");
      console.log("🔄 Using followupToken:", response.followupToken);

      // Call OCR with full text extraction using the cached image
      const ocrResult = await ocr(
        response.followupToken,
        true, // full text extraction
        'darija',
        response.sessionId
      );

      if (ocrResult.text && ocrResult.text.trim()) {
        console.log("📄 OCR extracted text length:", ocrResult.text.length);
        // Play the full text using TTS
        await playTTS(ocrResult.text);
      } else {
        Alert.alert("No Text", "No readable text found in the image.");
      }
    } catch (error) {
      console.error("Read all text error:", error);
      Alert.alert("Error", "Failed to read text from image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Camera permission required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nadar Demo</Text>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? theme.colors.success : theme.colors.error }]} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />
        
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handleGallery}
            disabled={isLoading || isRecording}
          >
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.shutterButton,
              (isLoading || isRecording) && styles.shutterButtonDisabled
            ]}
            onPress={isRecording ? stopRecordingAndCapture : handleCapture}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : isRecording ? (
              <View style={[styles.shutterInner, { backgroundColor: theme.colors.error }]} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonActive
            ]}
            onPress={isRecording ? stopRecordingAndCapture : startRecording}
            disabled={isLoading}
          >
            {isRecording ? (
              <ActivityIndicator color={theme.colors.text} size="small" />
            ) : (
              <Text style={styles.buttonText}>🎤</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Mode indicator */}
        <View style={styles.modeIndicator}>
          <Text style={styles.modeText}>
            {isRecording
              ? "🔴 Recording... Tap shutter or mic to capture with audio"
              : "Tap shutter for image only, or mic to record with audio"
            }
          </Text>
        </View>
      </View>

      {response && (
        <ScrollView style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Text style={styles.responseText}>{response.speak}</Text>
            {isPlayingTTS && (
              <View style={styles.ttsIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.ttsIndicatorText}>Playing...</Text>
              </View>
            )}
          </View>
          
          {response.details && response.details.length > 0 && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.moreButtonText}>
                {showDetails ? "Less" : "More"}
              </Text>
            </TouchableOpacity>
          )}
          
          {showDetails && response.details && (
            <View style={styles.detailsContainer}>
              {response.details.map((detail, index) => (
                <Text key={index} style={styles.detailText}>
                  • {detail}
                </Text>
              ))}
            </View>
          )}
          
          {response.signals.has_text && (
            <TouchableOpacity
              style={[styles.readAllButton, isLoading && styles.buttonDisabled]}
              onPress={handleReadAllText}
              disabled={isLoading}
            >
              <Text style={styles.readAllButtonText}>Read all text</Text>
            </TouchableOpacity>
          )}
          
          {response.followup_suggest && response.followup_suggest.length > 0 && (
            <View style={styles.followUpContainer}>
              <Text style={styles.followUpLabel}>Ask more:</Text>
              {response.followup_suggest.slice(0, 3).map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.followUpChip}
                  onPress={() => handleFollowUp(suggestion)}
                >
                  <Text style={styles.followUpChipText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginRight: theme.spacing(1),
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    alignSelf: "center",
  },
  cameraContainer: {
    flex: 1,
    margin: theme.spacing(2),
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    bottom: theme.spacing(3),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: theme.spacing(4),
  },
  galleryButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
  },
  micButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
  },
  buttonText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
  shutterButtonDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.text,
  },
  responseContainer: {
    maxHeight: 300,
    backgroundColor: theme.colors.surface,
    margin: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.radius.lg,
  },
  responseHeader: {
    marginBottom: theme.spacing(2),
  },
  responseText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
  },
  ttsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing(1),
  },
  ttsIndicatorText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginLeft: theme.spacing(0.5),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  moreButton: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing(0.5),
  },
  moreButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  detailsContainer: {
    marginTop: theme.spacing(1),
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    marginBottom: theme.spacing(0.5),
  },
  readAllButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    alignSelf: "flex-start",
    marginTop: theme.spacing(1),
  },
  readAllButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: "600",
  },
  followUpContainer: {
    marginTop: theme.spacing(2),
  },
  followUpLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMut,
    marginBottom: theme.spacing(1),
  },
  followUpChip: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.75),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(0.5),
    alignSelf: "flex-start",
  },
  followUpChipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  micButtonActive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  modeIndicator: {
    position: 'absolute',
    bottom: theme.spacing(1),
    left: theme.spacing(2),
    right: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
  },
  modeText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
