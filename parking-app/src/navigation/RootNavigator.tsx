import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Button } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/context/AuthContext";
import type { OcrResult } from "@/lib/ocr";

import LoginScreen from "@/screens/auth/LoginScreen";
import ScanScreen from "@/screens/guard/ScanScreen";
import ConfirmPlateScreen from "@/screens/guard/ConfirmPlateScreen";
import LiveStatusScreen from "@/screens/guard/LiveStatusScreen";
import AlertsScreen from "@/screens/guard/AlertsScreen";

import DashboardScreen from "@/screens/admin/DashboardScreen";
import OwnersScreen from "@/screens/admin/OwnersScreen";
import VehiclesScreen from "@/screens/admin/VehiclesScreen";
import UsersScreen from "@/screens/admin/UsersScreen";
import RecordsScreen from "@/screens/admin/RecordsScreen";
import ReportsScreen from "@/screens/admin/ReportsScreen";
import LogsScreen from "@/screens/admin/LogsScreen";

export type GuardStackParamList = {
  Scan: undefined;
  ConfirmPlate: { photoUri: string; ocrResult: OcrResult };
  LiveStatus: undefined;
  Alerts: { flaggedPlate?: string; photoUri?: string } | undefined;
};

const AuthStack = createNativeStackNavigator();
const GuardStack = createNativeStackNavigator<GuardStackParamList>();
const GuardTabs = createBottomTabNavigator();
const AdminTabs = createBottomTabNavigator();

function GuardScanStack() {
  return (
    <GuardStack.Navigator screenOptions={{ headerShown: false }}>
      <GuardStack.Screen name="Scan" component={ScanScreen} />
      <GuardStack.Screen
        name="ConfirmPlate"
        component={ConfirmPlateScreen}
        options={{ headerShown: true, title: "Confirm Plate" }}
      />
    </GuardStack.Navigator>
  );
}

function SignOutButton() {
  const { signOut } = useAuth();
  return <Button onPress={signOut}>Sign Out</Button>;
}

function GuardNavigator() {
  return (
    <GuardTabs.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <SignOutButton />,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            ScanTab: "camera-outline",
            LiveStatus: "car-multiple",
            Alerts: "alert-circle-outline",
          };
          return (
            <MaterialCommunityIcons name={(icons[route.name] ?? "circle") as any} color={color} size={size} />
          );
        },
      })}
    >
      <GuardTabs.Screen
        name="ScanTab"
        component={GuardScanStack}
        options={{ title: "Scan", headerShown: false }}
      />
      <GuardTabs.Screen name="LiveStatus" component={LiveStatusScreen} options={{ title: "Live Status" }} />
      <GuardTabs.Screen name="Alerts" component={AlertsScreen} options={{ title: "Alerts" }} />
    </GuardTabs.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminTabs.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <SignOutButton />,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: "view-dashboard-outline",
            Owners: "account-group-outline",
            Vehicles: "car-outline",
            Records: "history",
            Users: "shield-account-outline",
            Reports: "chart-bar",
            Logs: "text-box-check-outline",
          };
          return (
            <MaterialCommunityIcons name={(icons[route.name] ?? "circle") as any} color={color} size={size} />
          );
        },
      })}
    >
      <AdminTabs.Screen name="Dashboard" component={DashboardScreen} />
      <AdminTabs.Screen name="Owners" component={OwnersScreen} />
      <AdminTabs.Screen name="Vehicles" component={VehiclesScreen} />
      <AdminTabs.Screen name="Records" component={RecordsScreen} />
      <AdminTabs.Screen name="Users" component={UsersScreen} />
      <AdminTabs.Screen name="Reports" component={ReportsScreen} />
      <AdminTabs.Screen name="Logs" component={LogsScreen} />
    </AdminTabs.Navigator>
  );
}

export default function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session || !profile ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      ) : profile.role === "admin" ? (
        <AdminNavigator />
      ) : (
        <GuardNavigator />
      )}
    </NavigationContainer>
  );
}
