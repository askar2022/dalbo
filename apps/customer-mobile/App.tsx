import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.badge}>Dalbo Customer</Text>
        <Text style={styles.title}>Good food, delivered to you.</Text>
        <Text style={styles.description}>
          This Expo app is the starting point for browsing food places, ordering meals, and
          tracking deliveries.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf5",
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
    color: "#ff6200",
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
