#!/bin/bash

# Script para configurar o repositório Git do template
# Execute este script após clonar ou baixar o template

echo "🔧 Configurando repositório Git para o template..."

# Inicializar Git se não existir
if [ ! -d ".git" ]; then
    echo "📦 Inicializando repositório Git..."
    git init
fi

# Adicionar todos os arquivos
echo "📝 Adicionando arquivos ao Git..."
git add .

# Fazer commit inicial
echo "💾 Fazendo commit inicial..."
git commit -m "🚀 Initial commit: Expo + NativeWind template

✨ Features included:
- Expo SDK configured
- NativeWind with Tailwind CSS
- React Native Reanimated
- React Native Safe Area Context
- Metro configuration
- TypeScript support
- Ready to use template"

echo "✅ Template configurado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Crie um repositório no GitHub"
echo "2. Adicione o remote: git remote add origin https://github.com/seu-usuario/expo-nativewind-template.git"
echo "3. Faça push: git push -u origin main"
echo "4. Marque como template no GitHub (Settings → Template repository)"
echo ""
echo "🎯 Depois disso, você pode usar:"
echo "npx create-expo-app@latest meu-projeto --template https://github.com/seu-usuario/expo-nativewind-template.git"
