import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          OCR Parking Management
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Makilala National High School
        </Text>
      </View>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        mode="outlined"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        mode="outlined"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button mode="contained" onPress={handleLogin} loading={submitting} style={styles.button}>
        Sign In
      </Button>

      <Text variant="bodySmall" style={styles.footnote}>
        Accounts are created by an administrator. Contact your admin if you don't have one.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#F8FAFC" },
  header: { marginBottom: 32, alignItems: "center" },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#64748B", marginTop: 4 },
  input: { marginBottom: 12 },
  button: { marginTop: 8, paddingVertical: 4 },
  error: { color: "#DC2626", marginBottom: 8 },
  footnote: { marginTop: 24, textAlign: "center", color: "#94A3B8" },
});
