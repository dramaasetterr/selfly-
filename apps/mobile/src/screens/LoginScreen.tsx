import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../App";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { colors, shadows, borderRadius, typography, spacing } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
  };

  const handleLogin = async () => {
    clearErrors();

    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      setGeneralError("Invalid email or password. Please try again.");
    }
  };

  const handleShowForgotPassword = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForgotEmail(email);
    setForgotError("");
    setForgotSuccess(false);
    setShowForgotPassword(true);
  };

  const handleCancelForgotPassword = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowForgotPassword(false);
    setForgotError("");
    setForgotSuccess(false);
  };

  const handleSendResetLink = async () => {
    setForgotError("");

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (error) {
        setForgotError("Could not send reset email. Please check your email address and try again.");
      } else {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setForgotError("Could not send reset email. Please check your email address and try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>
              Log in to continue managing your sale
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {generalError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{generalError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                  emailError ? styles.inputError : null,
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError("");
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              {emailError ? (
                <Text style={styles.fieldError}>{emailError}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={handleShowForgotPassword}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                  passwordError ? styles.inputError : null,
                ]}
                placeholder="Your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              {passwordError ? (
                <Text style={styles.fieldError}>{passwordError}</Text>
              ) : null}
            </View>

            {/* Forgot Password Inline Form */}
            {showForgotPassword && (
              <View style={styles.forgotCard}>
                <Text style={styles.forgotTitle}>Reset Password</Text>

                {forgotSuccess ? (
                  <View style={styles.forgotSuccessBox}>
                    <Text style={styles.forgotSuccessIcon}>{"\u2709\uFE0F"}</Text>
                    <Text style={styles.forgotSuccessText}>
                      Check your email for a password reset link
                    </Text>
                    <TouchableOpacity
                      style={styles.forgotCancelButton}
                      onPress={handleCancelForgotPassword}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotCancelText}>Back to Login</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.forgotDescription}>
                      Enter your email address and we'll send you a link to reset your password.
                    </Text>

                    {forgotError ? (
                      <View style={styles.forgotErrorBanner}>
                        <Text style={styles.errorBannerText}>{forgotError}</Text>
                      </View>
                    ) : null}

                    <View style={styles.forgotInputGroup}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={[
                          styles.input,
                          forgotEmailFocused && styles.inputFocused,
                        ]}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.textMuted}
                        value={forgotEmail}
                        onChangeText={(text) => {
                          setForgotEmail(text);
                          if (forgotError) setForgotError("");
                        }}
                        onFocus={() => setForgotEmailFocused(true)}
                        onBlur={() => setForgotEmailFocused(false)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSendResetLink}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.forgotSendButton, forgotLoading && styles.buttonDisabled]}
                      onPress={handleSendResetLink}
                      disabled={forgotLoading}
                      activeOpacity={0.85}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.forgotSendButtonText}>Send Reset Link</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.forgotCancelButton}
                      onPress={handleCancelForgotPassword}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => navigation.navigate("SignUp")}
              activeOpacity={0.6}
            >
              <Text style={styles.switchAuthText}>
                Don't have an account?{" "}
                <Text style={styles.switchAuthLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: 40,
    justifyContent: "space-between",
  },

  // Header
  header: {
    marginBottom: 40,
  },
  heading: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
  },

  // Form
  form: {
    gap: 22,
    marginBottom: 40,
  },
  inputGroup: {
    gap: 7,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  forgotLink: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputFocused: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  fieldError: {
    ...typography.small,
    color: colors.error,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.errorDark,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 17,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginTop: 4,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },

  // Forgot Password Card
  forgotCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  forgotTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  forgotDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  forgotInputGroup: {
    gap: 7,
    marginBottom: spacing.md,
  },
  forgotErrorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    marginBottom: spacing.md,
  },
  forgotSendButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  forgotSendButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  forgotCancelButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  forgotCancelText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  forgotSuccessBox: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  forgotSuccessIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  forgotSuccessText: {
    ...typography.body,
    color: colors.accent,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: spacing.md,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 16,
  },
  switchAuthText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  switchAuthLink: {
    color: colors.primaryLight,
    fontWeight: "700",
  },
});
