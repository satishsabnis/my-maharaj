import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>My Maharaj</Text>
      <Text style={styles.sub}>मेरा महाराज · माझा महाराज</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/signup')}>
        <Text style={styles.btnText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn2} onPress={() => router.push('/login')}>
        <Text style={styles.btn2Text}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B3A6B' },
  logo: { width: 200, height: 120, resizeMode: 'contain', marginBottom: 16 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  sub: { fontSize: 18, color: '#C9A227', marginBottom: 48 },
  btn: { backgroundColor: '#C9A227', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, marginBottom: 16, width: 220, alignItems: 'center' },
  btnText: { color: '#1B3A6B', fontWeight: 'bold', fontSize: 18 },
  btn2: { borderWidth: 2, borderColor: '#FFFFFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, width: 220, alignItems: 'center' },
  btn2Text: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
});
