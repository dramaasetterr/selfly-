import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { AppStackParamList } from "../../App";
import type { Document } from "@selfly/shared";

const PDF_HTML_WRAPPER = (html: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    body {
      font-family: "Times New Roman", Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 24pt; font-weight: bold; }
    h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 8pt; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4pt; }
    h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 6pt; font-weight: bold; }
    p { margin: 6pt 0; }
    .signature-line { border-bottom: 1px solid #000; width: 250px; display: inline-block; margin: 8pt 4pt; }
    .field-blank { border-bottom: 1px solid #000; display: inline-block; min-width: 150px; margin: 0 4pt; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

export default function DocumentViewerScreen() {
  const route = useRoute<RouteProp<AppStackParamList, "DocumentViewer">>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { document: doc } = route.params;
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const htmlContent = doc.html_content || `<pre>${doc.content}</pre>`;
      const fullHtml = PDF_HTML_WRAPPER(htmlContent, doc.title || "Document");

      const { uri } = await Print.printToFileAsync({ html: fullHtml });

      // Upload to Supabase Storage
      if (user) {
        try {
          const fileResponse = await fetch(uri);
          const blob = await fileResponse.blob();
          const filePath = `${user.id}/${doc.id}.pdf`;

          await supabase.storage.from("documents").upload(filePath, blob, {
            contentType: "application/pdf",
            upsert: true,
          });

          const {
            data: { publicUrl },
          } = supabase.storage.from("documents").getPublicUrl(filePath);

          await supabase
            .from("documents")
            .update({ pdf_url: publicUrl })
            .eq("id", doc.id);
        } catch {
          // Upload failure is non-critical; PDF is still available locally
        }
      }

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", "PDF saved successfully.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {doc.title || "Document"}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.documentWrapper}>
        <ScrollView
          style={styles.documentScroll}
          contentContainerStyle={styles.documentContent}
        >
          <Text style={styles.documentTitle}>{doc.title}</Text>
          <Text style={styles.documentBody}>{doc.content}</Text>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.downloadButtonText}>Download as PDF</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "500",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  documentWrapper: {
    flex: 1,
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  documentScroll: {
    flex: 1,
  },
  documentContent: {
    padding: 28,
    paddingTop: 36,
    paddingBottom: 40,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "serif",
  },
  documentBody: {
    fontSize: 14,
    lineHeight: 22,
    color: "#1F2937",
    fontFamily: "serif",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  downloadButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
