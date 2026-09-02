/*
 * Configuração do projeto Firebase "gira-booking".
 *
 * Estas chaves são públicas por natureza — o Firebase é desenhado para
 * que este arquivo fique visível no código do site. A segurança real
 * do sistema está nas "Firestore Security Rules" (configuradas no
 * painel do Firebase) e na senha de cada usuário, não neste arquivo.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAXMbrUFx5E_UPKxFUOzLebm3FDvath4PE",
  authDomain: "gira-booking.firebaseapp.com",
  projectId: "gira-booking",
  storageBucket: "gira-booking.firebasestorage.app",
  messagingSenderId: "725552092141",
  appId: "1:725552092141:web:bc3bdea33d3fb9fff9cde4"
};

firebase.initializeApp(firebaseConfig);
