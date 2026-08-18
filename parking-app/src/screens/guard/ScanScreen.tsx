import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GuardStackParamList } from "@/navigation/RootNavigator";
import { recognizePlate } from "@/lib/ocr";
import { Palette } from "@/theme/colors";

type Props = NativeStackScreenProps<GuardStackParamList, "Scan">;

export default function ScanScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const camera = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [processing, setProcessing] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("ALIGN VEHICLE / PLATE IN VIEW");
  const isScanningRef = useRef(false);

  // High-Tech Scanning Laser Animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    if (isFocused) {
      scanLoop.start();
    } else {
      scanLoop.stop();
    }
    return () => scanLoop.stop();
  }, [isFocused]);

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

        if (ocrResult.candidatePlate && ocrResult.confidence === "high") {
          setStatusMessage(`LOCK ACQUIRED: ${ocrResult.candidatePlate}`);
          clearInterval(intervalId);
          navigation.navigate("ConfirmPlate", { photoUri, ocrResult });
        } else {
          setStatusMessage("ALIGN VEHICLE / PLATE IN VIEW");
        }
      } catch (err) {
        // Skip frame
      } finally {
        isScanningRef.current = false;
      }
    }, 1400);

    return () => {
      clearInterval(intervalId);
    };
  }, [isFocused, autoScanEnabled, hasPermission, device, navigation]);

  // Manual Capture button
  async function handleManualCapture() {
    if (!camera.current || processing) return;
    setProcessing(true);
    setStatusMessage("ANALYZING TARGET...");
    try {
      const photo = await camera.current.takePhoto({ flash: "auto" });
      const photoUri = `file://${photo.path}`;
      const ocrResult = await recognizePlate(photoUri);
      navigation.navigate("ConfirmPlate", { photoUri, ocrResult });
    } catch (err) {
      setStatusMessage("SCAN FAILED. RETRY.");
    } finally {
      setProcessing(false);
    }
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="camera-off" size={48} color={Palette.danger} />
        <Text style={{ color: "#0F172A", marginTop: 12, fontWeight: "700" }}>Camera Access Required</Text>
        <Button mode="contained" onPress={requestPermission} buttonColor={Palette.primary} style={{ marginTop: 16 }}>
          Grant Camera Permission
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#0F172A" }}>No camera device found.</Text>
      </View>
    );
  }

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 170],
  });

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        photo
      />

      {/* Top HUD Bar */}
      <View style={styles.topBar}>
        <View style={styles.topHeaderCard}>
          <View style={styles.liveIndicator}>
            <View style={styles.livePulse} />
            <Text style={styles.liveLabel}>AI OCR SCANNER</Text>
          </View>
          <Chip
            icon={autoScanEnabled ? "radar" : "pause-circle"}
            selected={autoScanEnabled}
            onPress={() => setAutoScanEnabled((prev) => !prev)}
            style={[styles.modeChip, autoScanEnabled ? styles.activeChip : undefined]}
            textStyle={{ color: autoScanEnabled ? "#0267D2" : "#64748B", fontSize: 11, fontWeight: "700" }}
          >
            {autoScanEnabled ? "AUTO SCAN ACTIVE" : "MANUAL MODE"}
          </Chip>
        </View>
      </View>

      {/* Mask & Facial/Biometric Style Viewfinder */}
      <View style={styles.maskContainer} pointerEvents="none">
        <View style={styles.maskTop} />
        <View style={styles.maskMiddleRow}>
          <View style={styles.maskSide} />
          
          <View style={styles.reticleContainer}>
            {/* Outer Biometric Brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Center Crosshairs & AI Facial Mesh Markers */}
            <View style={styles.centerCrosshair}>
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
            </View>

            {/* Corner Node Dots */}
            <View style={[styles.nodeDot, { top: 12, left: 12 }]} />
            <View style={[styles.nodeDot, { top: 12, right: 12 }]} />
            <View style={[styles.nodeDot, { bottom: 12, left: 12 }]} />
            <View style={[styles.nodeDot, { bottom: 12, right: 12 }]} />

            {/* Animated Laser Beam */}
            <Animated.View
              style={[
                styles.laserBeam,
                {
                  transform: [{ translateY: laserTranslateY }],
                },
              ]}
            >
              <View style={styles.laserLine} />
              <View style={styles.laserGlow} />
            </Animated.View>
          </View>

          <View style={styles.maskSide} />
        </View>

        <View style={styles.maskBottom}>
          <View style={styles.hudBadge}>
            <MaterialCommunityIcons name="line-scan" size={16} color="#00E5FF" style={{ marginRight: 6 }} />
            <Text style={styles.hudText}>{statusMessage}</Text>
          </View>
          <Text style={styles.hudSub}>Position vehicle plate within recognition brackets</Text>
        </View>
      </View>

      {/* Bottom Action Controls */}
      <View style={styles.controls}>
        {processing ? (
          <ActivityIndicator animating size="large" color="#00E5FF" />
        ) : (
          <Button
            mode="contained"
            icon="camera-iris"
            onPress={handleManualCapture}
            style={styles.captureButton}
            contentStyle={styles.buttonContent}
            buttonColor="#0267D2"
          >
            CAPTURE & ANALYZE
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#F8FAFC" },
  topBar: {
    position: "absolute",
    top: 48,
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topHeaderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(11, 25, 44, 0.85)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(2, 103, 210, 0.4)",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00E5FF",
    marginRight: 8,
  },
  liveLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  modeChip: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    height: 30,
  },
  activeChip: {
    backgroundColor: "rgba(2, 103, 210, 0.25)",
    borderColor: "#0267D2",
    borderWidth: 1,
  },
  // Mask & Targeting Overlay
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(11, 25, 44, 0.65)",
  },
  maskMiddleRow: {
    height: 190,
    flexDirection: "row",
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(11, 25, 44, 0.65)",
  },
  reticleContainer: {
    width: 300,
    height: 190,
    position: "relative",
    backgroundColor: "rgba(2, 103, 210, 0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
    overflow: "hidden",
  },
  // Recognition Corners (HUD style)
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#00E5FF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  centerCrosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 14,
    height: 1.5,
    backgroundColor: "rgba(0, 229, 255, 0.5)",
  },
  crosshairV: {
    position: "absolute",
    width: 1.5,
    height: 14,
    backgroundColor: "rgba(0, 229, 255, 0.5)",
  },
  nodeDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00E5FF",
  },
  laserBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 20,
    justifyContent: "center",
  },
  laserLine: {
    height: 2,
    backgroundColor: "#00E5FF",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  laserGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -4,
    bottom: -4,
    backgroundColor: "rgba(0, 229, 255, 0.15)",
  },
  maskBottom: {
    flex: 1.3,
    backgroundColor: "rgba(11, 25, 44, 0.65)",
    alignItems: "center",
    paddingTop: 24,
  },
  hudBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11, 25, 44, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
  },
  hudText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  hudSub: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 8,
  },
  controls: {
    position: "absolute",
    bottom: 36,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  captureButton: {
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#0267D2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonContent: {
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
});


