import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import ReactNativeBlobUtil from 'react-native-blob-util';
import * as XLSX from 'xlsx';

export default function App() {
  const webViewRef = useRef(null);
  const [dadosJson, setDadosJson] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function lerExcelNativoCLI() {
      try {
        let dadosBase64 = '';

        if (Platform.OS === 'android') {
          // No Android, lê direto da pasta de assets nativa
          dadosBase64 = await ReactNativeBlobUtil.fs.readFile(
            'bundle-assets://dados.xlsx', 
            'base64'
          );
        } else {
          // No iOS, busca o caminho do arquivo no Main Bundle do app
          const caminhoIos = `${ReactNativeBlobUtil.fs.dirs.MainBundleDir}/planilha.xlsx`;
          dadosBase64 = await ReactNativeBlobUtil.fs.readFile(caminhoIos, 'base64');
        }

        // O SheetJS processa o Base64 obtido
        const workbook = XLSX.read(dadosBase64, { type: 'base64' });
        const primeiraAba = workbook.SheetNames[0];
        const planilha = workbook.Sheets[primeiraAba];
        const resultadoJson = XLSX.utils.sheet_to_json(planilha);

        setDadosJson(resultadoJson);
        setCarregando(false);
      } catch (erro) {
        console.error("Erro ao ler o arquivo Excel no CLI:", erro);
        setCarregando(false);
      }
    }

    lerExcelNativoCLI();
  }, []);

  const enviarDadosParaWebView = () => {
    if (dadosJson && webViewRef.current) {
      const dadosString = JSON.stringify(dadosJson);
      webViewRef.current.injectJavaScript(`
        if (window.receberDadosExcel) {
          window.receberDadosExcel(${dadosString});
        }
        true;
      `);
    }
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <Text>Processando planilha no ambiente CLI...</Text>
      </View>
    );
  }

  // Definição da origem do HTML local no React Native CLI
  const htmlSource = Platform.select({
    ios: require('./index.html'), 
    android: { uri: 'file:///android_asset/index.html' }, 
  });

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={htmlSource}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        onLoadEnd={enviarDadosParaWebView}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});