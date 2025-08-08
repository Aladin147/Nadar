import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, setMediaPermission] = useState<boolean | null>(null);

  const steps = [
    {
      title: "Welcome to Nadar",
      subtitle: "Your AI-powered visual assistant",
      content: "Nadar helps you understand your surroundings through advanced AI vision and clear audio descriptions.",
      action: "Get Started"
    },
    {
      title: "Camera Access",
      subtitle: "Capture what you want to understand",
      content: "We need camera access to analyze your surroundings and provide instant descriptions.",
      action: cameraPermission?.granted ? "Camera Ready ✓" : "Enable Camera"
    },
    {
      title: "Photo Library",
      subtitle: "Analyze existing images",
      content: "Access your photo library to analyze images you've already taken.",
      action: mediaPermission ? "Library Ready ✓" : "Enable Library Access"
    },
    {
      title: "You're All Set!",
      subtitle: "Ready to explore the world",
      content: "Tap anywhere on the camera screen to capture and analyze. Use the modes below to switch between Scene, Read, and Q&A.",
      action: "Start Using Nadar"
    }
  ];

  const currentStep = steps[step];

  async function handleNext() {
    if (step === 1 && !cameraPermission?.granted) {
      await requestCameraPermission();
      return;
    }
    
    if (step === 2 && !mediaPermission) {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setMediaPermission(result.granted);
      return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#0a0a0a", "#1a1a2e", "#16213e"]} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.progressDot, 
                  index <= step && styles.progressDotActive
                ]} 
              />
            ))}
          </View>
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
          
          <View style={styles.contentCard}>
            <Text style={styles.stepContent}>{currentStep.content}</Text>
          </View>

          {step === 1 && (
            <View style={styles.featureList}>
              <FeatureItem icon="📷" text="Instant scene analysis" />
              <FeatureItem icon="📖" text="Text recognition (OCR)" />
              <FeatureItem icon="❓" text="Ask questions about images" />
            </View>
          )}

          {step === 2 && (
            <View style={styles.featureList}>
              <FeatureItem icon="🖼️" text="Analyze saved photos" />
              <FeatureItem icon="📱" text="Process screenshots" />
              <FeatureItem icon="📄" text="Read documents" />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <PrimaryButton 
            title={currentStep.action} 
            onPress={handleNext}
            style={styles.nextButton}
          />
          
          {step > 0 && (
            <Text 
              style={styles.skipText} 
              onPress={() => setStep(step - 1)}
            >
              Back
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, padding: theme.spacing(3) },
  header: { alignItems: 'center', marginBottom: theme.spacing(4) },
  progressContainer: { 
    flexDirection: 'row', 
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepContainer: { flex: 1, alignItems: 'center' },
  stepTitle: {
    ...theme.typography.title,
    color: '#fff',
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  stepSubtitle: {
    color: theme.colors.textMut,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  contentCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepContent: {
    color: '#e5e7eb',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  featureList: {
    gap: theme.spacing(2),
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    fontSize: 20,
    marginRight: theme.spacing(2),
  },
  featureText: {
    color: '#e5e7eb',
    fontSize: 14,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing(4),
  },
  nextButton: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  skipText: {
    color: theme.colors.textMut,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
