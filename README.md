# 🚀 Expo + NativeWind Template

Template personalizado do Expo com NativeWind pré-configurado e pronto para uso.

## ✨ Funcionalidades incluídas

- ✅ **Expo SDK** mais recente
- ✅ **NativeWind** configurado e funcionando
- ✅ **Tailwind CSS** com preset correto
- ✅ **React Native Reanimated** para animações
- ✅ **React Native Safe Area Context** para áreas seguras
- ✅ **Configuração completa do Metro** para NativeWind
- ✅ **Tipos TypeScript** para NativeWind
- ✅ **Estrutura limpa** e organizada

## 🎯 Como usar este template

### Opção 1: Clonar e usar localmente
```bash
# Clone este repositório
git clone https://github.com/seu-usuario/expo-nativewind-template.git

# Crie um novo projeto usando o template
npx create-expo-app@latest meu-projeto --template ./expo-nativewind-template

# Entre no projeto
cd meu-projeto

# Instale as dependências
npm install

# Inicie o projeto
npm start
```

### Opção 2: Usar diretamente do GitHub
```bash
npx create-expo-app@latest meu-projeto --template https://github.com/seu-usuario/expo-nativewind-template.git
```

## 📁 Estrutura do template

```
expo-nativewind-template/
├── App.js                 # App principal com exemplo
├── global.css            # Estilos globais do Tailwind
├── tailwind.config.js    # Configuração do Tailwind com preset
├── metro.config.js       # Configuração do Metro para NativeWind
├── nativewind-env.d.ts   # Tipos TypeScript
├── app.json             # Configuração do Expo
├── package.json         # Dependências
└── README.md           # Este arquivo
```

## 🎨 Exemplo de uso

Após criar o projeto, você pode usar classes Tailwind diretamente:

```jsx
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 bg-blue-500 items-center justify-center">
      <Text className="text-white text-xl font-bold">
        Hello NativeWind! 🎉
      </Text>
    </View>
  );
}
```

## 🛠️ Comandos disponíveis

```bash
npm start          # Inicia o servidor de desenvolvimento
npm run web        # Inicia no navegador
npm run android    # Inicia no Android
npm run ios        # Inicia no iOS
```

## 📱 Plataformas suportadas

- ✅ **Web** (React Native Web)
- ✅ **Android**
- ✅ **iOS**
- ✅ **Expo Go**

## 🔧 Configurações incluídas

- **Tailwind CSS** com preset do NativeWind
- **Metro** configurado para processar CSS
- **TypeScript** com tipos para NativeWind
- **Expo** com configurações otimizadas

## 📄 Licença

MIT License - Use livremente em seus projetos!

---

**Criado com ❤️ para acelerar o desenvolvimento React Native**
