import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 h-full items-center bg-white items-center justify-center">
      <Text className="text-lg font-bold text-blue-600">
        Template App com NativeWind!
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
