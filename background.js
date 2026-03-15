// background.js - Versión COMPLETA y CORREGIDA
console.log('🚀 Background.js iniciado');

// Almacenar API key
let apiKey = '';

// Crear menús contextuales al instalar
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Extensión instalada/actualizada');
  
  // Limpiar menús anteriores
  chrome.contextMenus.removeAll(() => {
    // Crear menú para traducir a chino
    chrome.contextMenus.create({
      id: 'translate-to-chinese',
      title: '🇨🇳 翻译成中文 (Translate to Chinese)',
      contexts: ['selection']
    });
    
    // Crear menú para traducir a inglés
    chrome.contextMenus.create({
      id: 'translate-to-english',
      title: '🇬🇧 Translate to English',
      contexts: ['selection']
    });
    
    // Opción de auto-detección
    chrome.contextMenus.create({
      id: 'auto-translate',
      title: '🌐 Auto traducir (detectar idioma)',
      contexts: ['selection']
    });
    
    console.log('✅ Menús contextuales creados');
  });
});

// Función para verificar servidor Flask
async function checkServer() {
  try {
    const response = await fetch('http://127.0.0.1:5000/health');
    const data = await response.json();
    console.log('✅ Servidor conectado. Caché:', data.cache_size || 0, 'entradas');
    return true;
  } catch (error) {
    console.error('❌ Servidor no disponible:', error);
    return false;
  }
}

// Función para mostrar loading en la página
async function showLoadingInPage(tabId, originalText) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (text) => {
        // Crear función de loading si no existe
        if (!window.mostrarLoading) {
          window.mostrarLoading = function(original) {
            // Eliminar loading anterior
            const existingLoading = document.getElementById('loading-popup');
            if (existingLoading) existingLoading.remove();
            
            // Obtener selección
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Crear popup de carga
            const loadingPopup = document.createElement('div');
            loadingPopup.id = 'loading-popup';
            loadingPopup.style.cssText = `
              position: absolute;
              top: ${rect.bottom + window.scrollY + 15}px;
              left: ${rect.left + window.scrollX}px;
              background: white;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.15);
              z-index: 9999;
              min-width: 250px;
              text-align: center;
              font-family: Arial, sans-serif;
              border: 1px solid #e0e0e0;
              animation: fadeIn 0.3s ease;
            `;
            
            // Añadir animación si no existe
            if (!document.getElementById('loading-styles')) {
              const style = document.createElement('style');
              style.id = 'loading-styles';
              style.textContent = `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              `;
              document.head.appendChild(style);
            }
            
            loadingPopup.innerHTML = `
              <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <p style="margin: 10px 0 0 0; color: #666; font-weight: bold;">Traduciendo...</p>
              <p style="font-size: 11px; color: #999; margin: 5px 0 0 0;">"${original.substring(0, 50)}${original.length > 50 ? '...' : ''}"</p>
              <button id="cancelLoadingBtn" style="margin-top: 15px; background: none; border: 1px solid #ccc; padding: 5px 15px; border-radius: 15px; color: #666; cursor: pointer; font-size: 12px;">Cancelar</button>
            `;
            
            document.body.appendChild(loadingPopup);
            
            document.getElementById('cancelLoadingBtn').onclick = () => {
              loadingPopup.remove();
            };
          };
        }
        
        // Mostrar loading
        if (window.mostrarLoading) {
          window.mostrarLoading(text);
        }
      },
      args: [originalText]
    });
    console.log('✅ Loading mostrado en página');
  } catch (error) {
    console.log('⚠️ No se pudo mostrar loading:', error);
  }
}

// Función para traducir
async function translateText(text, targetLang, tabId) {
  try {
    console.log(`🌐 Traduciendo "${text.substring(0, 30)}..." a ${targetLang}`);
    
    // MOSTRAR LOADING INMEDIATAMENTE
    await showLoadingInPage(tabId, text);
    
    // Verificar servidor
    const serverOk = await checkServer();
    if (!serverOk) {
      chrome.tabs.sendMessage(tabId, {
        action: 'error',
        message: 'Servidor Python no está corriendo. Ejecuta: python app.py'
      }).catch(() => {});
      return;
    }
    
    // Llamar a Flask
    const response = await fetch('http://127.0.0.1:5000/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        target: targetLang
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Traducción recibida del servidor:', data.translation.substring(0, 50));
      
      // Asegurar que content.js está cargado
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        console.log('✅ content.js inyectado/verificado');
        
        // Pequeña pausa para asegurar inicialización
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Enviar traducción
        chrome.tabs.sendMessage(tabId, {
          action: 'showTranslation',
          translation: data.translation,
          original: text
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error al enviar mensaje:', chrome.runtime.lastError);
            
            // Reintentar una vez
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, {
                action: 'showTranslation',
                translation: data.translation,
                original: text
              }).catch(e => {
                console.error('❌ Error fatal:', e);
                // Fallback: alerta nativa
                chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  func: (translation, original) => {
                    alert('✅ TRADUCCIÓN:\n\n' + translation + '\n\n📝 Original:\n' + original);
                  },
                  args: [data.translation, text]
                });
              });
            }, 500);
          } else {
            console.log('✅ Mensaje enviado con éxito a content.js');
          }
        });
        
      } catch (injectError) {
        console.error('❌ Error al inyectar content.js:', injectError);
        
        // Fallback extremo: nueva pestaña
        chrome.tabs.create({
          url: 'data:text/html,' + encodeURIComponent(`
            <html>
              <head>
                <title>Traducción</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
                  .container { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                  h1 { color: #4CAF50; font-size: 24px; margin-top: 0; }
                  .translation { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 18px; line-height: 1.6; }
                  .original { background: #f5f5f5; padding: 15px; border-radius: 8px; color: #666; }
                  button { background: #4CAF50; color: white; border: none; padding: 10px 25px; border-radius: 25px; font-size: 14px; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🌐 Traducción DeepSeek</h1>
                  <div class="translation">${data.translation}</div>
                  <div class="original">
                    <strong>Texto original:</strong><br>
                    ${text}
                  </div>
                  <button onclick="window.close()">Cerrar</button>
                </div>
              </body>
            </html>
          `)
        });
      }
      
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error general:', error);
    
    // Mostrar error en la página
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (errorMsg) => {
        alert('❌ Error: ' + errorMsg);
      },
      args: [error.message]
    }).catch(() => {});
  }
}

// Función para auto-traducir
async function autoTranslate(text, tabId) {
  try {
    console.log(`🌐 Auto-traduciendo "${text.substring(0, 30)}..."`);
    
    // Mostrar loading
    await showLoadingInPage(tabId, text);
    
    // Verificar servidor
    const serverOk = await checkServer();
    if (!serverOk) {
      chrome.tabs.sendMessage(tabId, {
        action: 'error',
        message: 'Servidor Python no está corriendo'
      }).catch(() => {});
      return;
    }
    
    // Llamar a Flask
    const response = await fetch('http://127.0.0.1:5000/auto-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Auto-traducción: ${data.source_language} → ${data.target_language}`);
      
      // Asegurar content.js
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      await new Promise(r => setTimeout(r, 200));
      
      // Enviar traducción
      chrome.tabs.sendMessage(tabId, {
        action: 'showTranslation',
        translation: data.translation,
        original: text
      });
    }
  } catch (error) {
    console.error('❌ Error en auto-traducción:', error);
  }
}

// Manejar clics en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('🖱️ Clic en menú:', info.menuItemId);
  
  const selectedText = info.selectionText;
  
  if (!selectedText) {
    console.warn('⚠️ No hay texto seleccionado');
    return;
  }
  
  if (!tab || !tab.id) {
    console.error('❌ No hay pestaña válida');
    return;
  }
  
  // Determinar acción
  if (info.menuItemId === 'translate-to-chinese') {
    translateText(selectedText, 'Chinese', tab.id);
  } else if (info.menuItemId === 'translate-to-english') {
    translateText(selectedText, 'English', tab.id);
  } else if (info.menuItemId === 'auto-translate') {
    autoTranslate(selectedText, tab.id);
  }
});

// Manejar mensajes desde popup.html
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveApiKey') {
    chrome.storage.sync.set({ deepseekApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get('deepseekApiKey', (result) => {
      sendResponse({ apiKey: result.deepseekApiKey });
    });
    return true;
  }
  
  if (request.action === 'checkServer') {
    checkServer().then(ok => {
      sendResponse({ running: ok });
    });
    return true;
  }
});

console.log('✅ Background.js completamente listo');