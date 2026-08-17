import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Text } from "react-native-paper";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GuardStackParamList } from "@/navigation/RootNavigator";
import { recognizePlate } from "@/lib/ocr";

type Props = NativeStackScreenProps<GuardStackParamList, "Scan">;

export default function ScanScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const camera = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [processing, setProcessing] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("Align license plate in frame");
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // Periodic Auto-Scan loop
  useEffect(() => {
    if (!isFocused || !autoScanEnabled || !hasPermission || !device) return;

    const intervalId = setInterval(async () => {
      if (isScanningRef.current || !camera.current || !isFocused) return;
      isScanningRef.current = true;
      try {
        const photo = await camera.current.takePhoto({ flash: "off" });
        const photoUri = `file://${photo.path}`;
        const ocrResult = await recognizePlate(photoUri);

        // If a valid candidate plate is found with high confidence or matching structure
        if (ocrResult.candidatePlate && (ocrResult.confidence === "high" || ocrResult.candidatePlate.length >= 6)) {
          setStatusMessage(`Detected plate: ${ocrResult.candidatePlate}`);
          clearInterval(intervalId);
          navigation.navigate("ConfirmPlate", { photoUri, ocrResult });
        }
      } catch (err) {
        // Silently skip transient capture errors in auto-scan loop
      } finally {
        isScanningRef.current = false;
      }
    }, 1500);

    return () => {
      clearInterval(intervalId);
    };
  }, [isFocused, autoScanEnabled, hasPermission, device, navigation]);

  // Manual Capture button
  async function handleManualCapture() {
    if (!camera.current || processing) return;
    setProcessing(true);
    setStatusMessage("Capturing plate...");
    try {
      const photo = await camera.current.takePhoto({ flash: "auto" });
      const photoUri = `file://${photo.path}`;
      const ocrResult = await recognizePlate(photoUri);
      navigation.navigate("ConfirmPlate", { photoUri, ocrResult });
    } catch (err) {
      console.warn("[scan] capture/OCR failed:", err);
      setStatusMessage("Scan failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Camera permission is required to scan plates.</Text>
        <Button mode="contained" onPress={requestPermission} style={{ marginTop: 12 }}>
          Grant Permission
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text>No camera device found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        photo
      />

      {/* Top Header / Mode Switch */}
      <View style={styles.topBar}>
        <Chip
          icon={autoScanEnabled ? "radar" : "camera-off"}
          selected={autoScanEnabled}
          onPress={() => setAutoScanEnabled((prev) => !prev)}
          style={[styles.modeChip, autoScanEnabled ? styles.activeChip : undefined]}
          textStyle={{ color: autoScanEnabled ? "#166534" : "#475569" }}
        >
          {autoScanEnabled ? "Auto-Scan ON" : "Auto-Scan OFF"}
        </Chip>
      </View>

      {/* Mask Overlay: darkened black outside the cutout frame */}
      <View style={styles.maskContainer} pointerEvents="none">
        <View style={styles.maskTop} />
        <View style={styles.maskMiddleRow}>
          <View style={styles.maskSide} />
          <View style={[styles.cutoutFrame, autoScanEnabled && styles.frameActive]}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={styles.maskBottom}>
          <Text style={styles.hint}>{statusMessage}</Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        {processing ? (
          <ActivityIndicator animating size="large" color="#fff" />
        ) : (
          <Button
            mode="contained"
            icon="camera"
            onPress={handleManualCapture}
            style={styles.captureButton}
            contentStyle={{ paddingHorizontal: 24, paddingVertical: 6 }}
            buttonColor="#2563EB"
          >
            Capture Plate
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  topBar: {
    position: "absolute",
    top: 50,
    width: "100%",
    alignItems: "center",
    zIndex: 10,
  },
  modeChip: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  activeChip: {
    backgroundColor: "#DCFCE7",
  },
  // Mask layout covering outside of cutout
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  maskMiddleRow: {
    height: 150,
    flexDirection: "row",
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  cutoutFrame: {
    width: 290,
    height: 150,
    borderWidth: 2,
    borderColor: "#94A3B8",
    borderRadius: 14,
    backgroundColor: "transparent",
    position: "relative",
  },
  frameActive: {
    borderColor: "#22C55E",
    borderWidth: 2.5,
  },
  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderColor: "#22C55E",
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  maskBottom: {
    flex: 1.4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    paddingTop: 18,
  },
  hint: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  controls: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  captureButton: {
    borderRadius: 28,
  },
});

