import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import PricingScreen from "./src/screens/PricingScreen";
import PricingResultsScreen from "./src/screens/PricingResultsScreen";
import ListingBuilderScreen from "./src/screens/ListingBuilderScreen";
import DocumentsScreen from "./src/screens/DocumentsScreen";
import DocumentViewerScreen from "./src/screens/DocumentViewerScreen";
import ShowingsScreen from "./src/screens/ShowingsScreen";
import ShowingDetailScreen from "./src/screens/ShowingDetailScreen";
import OffersScreen from "./src/screens/OffersScreen";
import OfferInputScreen from "./src/screens/OfferInputScreen";
import OfferAnalysisScreen from "./src/screens/OfferAnalysisScreen";
import OfferCompareScreen from "./src/screens/OfferCompareScreen";
import type { PricingInput, PricingResult, Document, OfferAnalysis, OfferInput } from "@selfly/shared";

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Pricing: undefined;
  PricingResults: { input: PricingInput; result: PricingResult };
  ListingBuilder: undefined;
  Documents: undefined;
  DocumentViewer: { document: Document };
  Showings: undefined;
  ShowingDetail: { showingId: string };
  Offers: undefined;
  OfferInput: { listingId: string };
  OfferAnalysis: {
    listingId: string;
    offerId?: string;
    analysis?: OfferAnalysis;
    offerInput?: OfferInput;
  };
  OfferCompare: { listingId: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Pricing" component={PricingScreen} />
      <AppStack.Screen name="PricingResults" component={PricingResultsScreen} />
      <AppStack.Screen name="ListingBuilder" component={ListingBuilderScreen} />
      <AppStack.Screen name="Documents" component={DocumentsScreen} />
      <AppStack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
      <AppStack.Screen name="Showings" component={ShowingsScreen} />
      <AppStack.Screen name="ShowingDetail" component={ShowingDetailScreen} />
      <AppStack.Screen name="Offers" component={OffersScreen} />
      <AppStack.Screen name="OfferInput" component={OfferInputScreen} />
      <AppStack.Screen name="OfferAnalysis" component={OfferAnalysisScreen} />
      <AppStack.Screen name="OfferCompare" component={OfferCompareScreen} />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </AuthProvider>
  );
}
