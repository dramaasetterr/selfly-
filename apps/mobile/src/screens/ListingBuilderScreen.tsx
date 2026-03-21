import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  PropertyType,
} from "@selfly/shared";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const MAX_PHOTOS = 25;
const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_GAP = 8;
const PHOTO_PADDING = 28 * 2;
const PHOTO_SIZE = (SCREEN_WIDTH - PHOTO_PADDING - PHOTO_GAP * 2) / 3;

type Props = NativeStackScreenProps<AppStackParamList, "ListingBuilder">;

const STEPS = ["Details", "Photos", "Description", "Review"];

export default function ListingBuilderScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Step 1 — Property Details
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("single_family");
  const [hoa, setHoa] = useState(false);
  const [hoaFee, setHoaFee] = useState("");
  const [condition, setCondition] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Step 2 — Photos
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 3 — Description
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Step 4 — Publish
  const [publishing, setPublishing] = useState(false);

  // Pre-fill from pricing data
  useEffect(() => {
    if (prefilled || !user) return;
    (async () => {
      const { data } = await supabase
        .from("pricing_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAddress(data.address || "");
        setBedrooms(String(data.bedrooms || ""));
        setBathrooms(String(data.bathrooms || ""));
        setSqft(String(data.sqft || ""));
        setYearBuilt(String(data.year_built || ""));
        if (data.condition) setCondition(data.condition);
        if (data.selected_price) setSelectedPrice(data.selected_price);
      }
      setPrefilled(true);
    })();
  }, [user, prefilled]);

  // Generate description when entering step 3
  const generateDescription = useCallback(async () => {
    if (description) return; // already generated/edited
    setGeneratingDesc(true);
    try {
      const res = await fetch(`${API_BASE}/api/listing-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          bedrooms: parseInt(bedrooms, 10),
          bathrooms: parseInt(bathrooms, 10),
          sqft: parseInt(sqft, 10),
          year_built: parseInt(yearBuilt, 10),
          property_type: propertyType,
          hoa,
          condition: condition || undefined,
          selected_price: selectedPrice || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate description");
      const result = await res.json();
      setTitle(result.title || "");
      setDescription(result.description || "");
    } catch {
      Alert.alert("Error", "Could not generate description. You can write your own below.");
    } finally {
      setGeneratingDesc(false);
    }
  }, [address, bedrooms, bathrooms, sqft, yearBuilt, propertyType, hoa, condition, selectedPrice, description]);

  const uploadPhotos = async () => {
    if (!user || photos.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const urls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = photo.uri.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}_${i}.${ext}`;

      const response = await fetch(photo.uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from("listing-photos")
        .upload(fileName, blob, { contentType: photo.mimeType || "image/jpeg" });

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(fileName);

      urls.push(urlData.publicUrl);
      setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
    }

    setPhotoUrls(urls);
    setUploading(false);
  };

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert("Limit Reached", `Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setPhotos((prev) => [...prev, ...result.assets].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!address || !bedrooms || !bathrooms || !sqft || !yearBuilt) {
        Alert.alert("Missing Fields", "Please fill in all property details.");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (photos.length > 0 && photoUrls.length === 0) {
        await uploadPhotos();
      }
      setStep(2);
      // Trigger description generation after state update
      setTimeout(() => generateDescription(), 100);
    } else if (step === 2) {
      if (!title) {
        Alert.alert("Missing Title", "Please enter a listing headline.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    setPublishing(true);
    try {
      const { error: insertError } = await supabase.from("listings").insert({
        user_id: user.id,
        address,
        bedrooms: parseInt(bedrooms, 10),
        bathrooms: parseInt(bathrooms, 10),
        sqft: parseInt(sqft, 10),
        year_built: parseInt(yearBuilt, 10),
        property_type: propertyType,
        hoa,
        hoa_fee: hoa && hoaFee ? parseFloat(hoaFee) : null,
        title,
        description,
        photos: photoUrls,
        price: selectedPrice,
        status: "active",
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ current_stage: "manage_showings" })
        .eq("id", user.id);

      if (updateError) throw updateError;

      navigation.navigate("Home");
    } catch {
      Alert.alert("Error", "Could not publish listing. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const formatPrice = (price: number) =>
    "$" + price.toLocaleString("en-US");

  // --- Step Indicator ---
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((label, i) => (
        <View key={label} style={styles.stepItem}>
          <View
            style={[
              styles.stepDot,
              i < step && styles.stepDotComplete,
              i === step && styles.stepDotCurrent,
            ]}
          >
            {i < step ? (
              <Text style={styles.stepCheck}>✓</Text>
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  i === step && styles.stepNumberCurrent,
                ]}
              >
                {i + 1}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              i === step && styles.stepLabelCurrent,
              i < step && styles.stepLabelComplete,
            ]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  // --- Step 1: Property Details ---
  const renderStep1 = () => (
    <>
      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St, City, State"
        placeholderTextColor="#9CA3AF"
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Bedrooms</Text>
          <TextInput
            style={styles.input}
            value={bedrooms}
            onChangeText={setBedrooms}
            placeholder="3"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Bathrooms</Text>
          <TextInput
            style={styles.input}
            value={bathrooms}
            onChangeText={setBathrooms}
            placeholder="2"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.label}>Square Footage</Text>
      <TextInput
        style={styles.input}
        value={sqft}
        onChangeText={setSqft}
        placeholder="e.g. 2000"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Year Built</Text>
      <TextInput
        style={styles.input}
        value={yearBuilt}
        onChangeText={setYearBuilt}
        placeholder="e.g. 1995"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Property Type</Text>
      <View style={styles.chipRow}>
        {PROPERTY_TYPES.map((pt) => (
          <TouchableOpacity
            key={pt}
            style={[styles.chip, propertyType === pt && styles.chipActive]}
            onPress={() => setPropertyType(pt)}
          >
            <Text style={[styles.chipText, propertyType === pt && styles.chipTextActive]}>
              {PROPERTY_TYPE_LABELS[pt]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>HOA</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, !hoa && styles.toggleButtonActive]}
          onPress={() => setHoa(false)}
        >
          <Text style={[styles.toggleText, !hoa && styles.toggleTextActive]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, hoa && styles.toggleButtonActive]}
          onPress={() => setHoa(true)}
        >
          <Text style={[styles.toggleText, hoa && styles.toggleTextActive]}>Yes</Text>
        </TouchableOpacity>
      </View>

      {hoa && (
        <>
          <Text style={styles.label}>HOA Monthly Fee ($)</Text>
          <TextInput
            style={styles.input}
            value={hoaFee}
            onChangeText={setHoaFee}
            placeholder="e.g. 350"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </>
      )}
    </>
  );

  // --- Step 2: Photos ---
  const renderStep2 = () => (
    <>
      <Text style={styles.sectionTitle}>Add Photos</Text>
      <Text style={styles.photoCount}>
        {photos.length} of {MAX_PHOTOS} photos
      </Text>

      {uploading && (
        <View style={styles.uploadProgress}>
          <View style={[styles.uploadBar, { width: `${uploadProgress}%` }]} />
          <Text style={styles.uploadText}>Uploading... {uploadProgress}%</Text>
        </View>
      )}

      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => removePhoto(index)}
            >
              <Text style={styles.removePhotoText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhotos}>
            <Text style={styles.addPhotoPlus}>+</Text>
            <Text style={styles.addPhotoLabel}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  // --- Step 3: Description ---
  const renderStep3 = () => (
    <>
      <Text style={styles.sectionTitle}>Listing Description</Text>
      <View style={styles.aiNote}>
        <Text style={styles.aiNoteText}>
          AI-generated description. Feel free to edit.
        </Text>
      </View>

      {generatingDesc ? (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.generatingText}>Generating your listing description...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Headline</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Stunning 3BR Home in Prime Location"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your property..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
        </>
      )}
    </>
  );

  // --- Step 4: Review ---
  const renderStep4 = () => (
    <>
      <Text style={styles.sectionTitle}>Review Your Listing</Text>

      {photoUrls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoCarousel}
        >
          {photoUrls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.carouselPhoto} />
          ))}
        </ScrollView>
      )}

      {title ? (
        <Text style={styles.reviewTitle}>{title}</Text>
      ) : null}

      {selectedPrice && (
        <Text style={styles.reviewPrice}>{formatPrice(selectedPrice)}</Text>
      )}

      <View style={styles.reviewDetails}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Address</Text>
          <Text style={styles.reviewValue}>{address}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Bedrooms</Text>
          <Text style={styles.reviewValue}>{bedrooms}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Bathrooms</Text>
          <Text style={styles.reviewValue}>{bathrooms}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Square Feet</Text>
          <Text style={styles.reviewValue}>{parseInt(sqft, 10).toLocaleString()}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Year Built</Text>
          <Text style={styles.reviewValue}>{yearBuilt}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Type</Text>
          <Text style={styles.reviewValue}>{PROPERTY_TYPE_LABELS[propertyType]}</Text>
        </View>
        {hoa && (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>HOA Fee</Text>
            <Text style={styles.reviewValue}>${hoaFee}/mo</Text>
          </View>
        )}
      </View>

      {description ? (
        <View style={styles.reviewDescSection}>
          <Text style={styles.reviewDescLabel}>Description</Text>
          <Text style={styles.reviewDescText}>{description}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Your Listing</Text>
        <Text style={styles.stepText}>Step {step + 1} of {STEPS.length}</Text>

        {renderStepIndicator()}

        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
        {step === 3 && renderStep4()}

        <View style={styles.navButtons}>
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.nextButton, uploading && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.publishButton, publishing && styles.buttonDisabled]}
              onPress={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.publishButtonText}>Publish Listing</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "500",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  // Step indicator
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepDotCurrent: {
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  stepDotComplete: {
    backgroundColor: "#2563EB",
  },
  stepCheck: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  stepNumberCurrent: {
    color: "#2563EB",
  },
  stepLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  stepLabelCurrent: {
    color: "#2563EB",
    fontWeight: "600",
  },
  stepLabelComplete: {
    color: "#6B7280",
  },
  // Form elements
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 200,
    paddingTop: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  toggleButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  // Photos
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  photoCount: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  uploadProgress: {
    height: 36,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
    justifyContent: "center",
  },
  uploadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#BFDBFE",
    borderRadius: 8,
  },
  uploadText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: PHOTO_GAP,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  removePhoto: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  removePhotoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addPhotoButton: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  addPhotoPlus: {
    fontSize: 28,
    color: "#9CA3AF",
    fontWeight: "300",
  },
  addPhotoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  // Description
  aiNote: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  aiNoteText: {
    fontSize: 13,
    color: "#1E40AF",
  },
  generatingContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  generatingText: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 16,
  },
  // Review
  photoCarousel: {
    marginBottom: 20,
  },
  carouselPhoto: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginRight: 10,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  reviewPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 16,
  },
  reviewDetails: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  reviewLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  reviewDescSection: {
    marginBottom: 16,
  },
  reviewDescLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  reviewDescText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
  },
  // Navigation buttons
  navButtons: {
    marginTop: 28,
  },
  nextButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  publishButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  publishButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
