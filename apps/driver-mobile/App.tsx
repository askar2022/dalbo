import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.badge}>Dalbo Driver</Text>
        <Text style={styles.title}>Pick up fast, deliver clearly, update status live.</Text>
        <Text style={styles.description}>
          This Expo app is the starting point for accepting jobs, navigating routes, and
          tracking delivery progress.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fff8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 16,
  },
  badge: {
    color: "#18a957",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#0b1020",
    fontSize: 32,
    fontWeight: "700",
  },
  description: {
    color: "#526077",
    fontSize: 16,
    lineHeight: 24,
  },
});
