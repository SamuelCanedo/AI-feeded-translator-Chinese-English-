// content.js - VERSIÓN UNIFICADA Y CORREGIDA
console.log('🔥 CONTENT.JS CARGADO -', new Date().toLocaleTimeString());

let popup = null;
let loadingPopup = null;

// Escuchar mensajes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensaje recibido:', request.action);
  
  // Siempre responder para evitar errores
  sendResponse({ received: true });
  
  if (request.action === 'showTranslation') {
    console.log('✅ Mostrando traducción:', request.translation.substring(0, 50));
    
    // IMPORTANTE: Esperar un momento para que el DOM esté listo
    setTimeout(() => {
      mostrarTraduccion(request.translation, request.original);
    }, 100);
    
  } else if (request.action === 'showTranslationPartial') {
    // Para cuando implementemos streaming
    mostrarTraduccionParcial(request.translation, request.original, request.isPartial);
    
  } else if (request.action === 'error') {
    alert('❌ Error: ' + request.message);
  }
  
  return true;
});

// Función principal para mostrar la traducción
function mostrarTraduccion(translation, original) {
  console.log('🎨 Ejecutando mostrarTraduccion');
  
  // Eliminar popup de loading si existe
  if (loadingPopup) {
    loadingPopup.remove();
    loadingPopup = null;
  }
  
  // Eliminar popup anterior si existe
  if (popup) {
    popup.remove();
    popup = null;
  }
  
  // Obtener la posición del texto seleccionado
  const selection = window.getSelection();
  if (!selection.rangeCount) {
    console.log('⚠️ No hay selección activa');
    return;
  }
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Calcular posición
  const popupTop = rect.bottom + window.scrollY + 15;
  const popupLeft = rect.left + window.scrollX;
  
  // Crear popup con la traducción
  popup = document.createElement('div');
  popup.id = 'translation-result-popup';
  popup.style.cssText = `
    position: absolute;
    top: ${popupTop}px;
    left: ${popupLeft}px;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    z-index: 10000;
    min-width: 300px;
    max-width: 450px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid #e0e0e0;
    animation: fadeIn 0.3s ease;
  `;
  
  // Añadir animación
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  // Construir contenido
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="background: #4CAF50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
        ✅ Traducido
      </span>
      <span style="color: #999; font-size: 11px;">
        ${original.length} caracteres
      </span>
    </div>
    
    <div style="background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <div style="color: #2c3e50; font-size: 18px; line-height: 1.6; font-weight: 500;">
        ${escapeHTML(translation)}
      </div>
    </div>
    
    <div style="background: #f1f3f4; border-radius: 8px; padding: 10px; margin-bottom: 15px;">
      <div style="color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 5px;">
        Texto original:
      </div>
      <div style="color: #444; font-size: 13px; line-height: 1.5;">
        ${escapeHTML(original.substring(0, 200))}${original.length > 200 ? '...' : ''}
      </div>
    </div>
    
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="copyBtn" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
      ">
        📋 Copiar
      </button>
      <button id="closeBtn" style="
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
      ">
        ✕ Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Eventos
  document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(translation).then(() => {
      const btn = document.getElementById('copyBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Copiado!';
      btn.style.background = '#45a049';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '#4CAF50';
      }, 2000);
    });
  };
  
  document.getElementById('closeBtn').onclick = () => {
    popup.remove();
    popup = null;
  };
  
  // Cerrar al hacer clic fuera
  setTimeout(() => {
    document.addEventListener('click', function closeOnClickOutside(e) {
      if (popup && !popup.contains(e.target)) {
        popup.remove();
        popup = null;
        document.removeEventListener('click', closeOnClickOutside);
      }
    });
  }, 200);
  
  console.log('✅ Popup mostrado correctamente');
}

// Función para mostrar popup de carga (la usa background.js)
window.mostrarLoading = function(original) {
  console.log('⏳ Mostrando loading');
  
  // Eliminar loading anterior
  if (loadingPopup) {
    loadingPopup.remove();
  }
  
  // Obtener selección
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Crear popup de carga
  loadingPopup = document.createElement('div');
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
  `;
  
  loadingPopup.innerHTML = `
    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    <p style="margin: 10px 0 0 0; color: #666;">Traduciendo...</p>
    <p style="font-size: 11px; color: #999; margin: 5px 0 0 0;">${escapeHTML(original.substring(0, 50))}${original.length > 50 ? '...' : ''}</p>
    <button id="cancelLoading" style="margin-top: 15px; background: none; border: 1px solid #ccc; padding: 5px 15px; border-radius: 15px; color: #666; cursor: pointer;">Cancelar</button>
  `;
  
  document.body.appendChild(loadingPopup);
  
  document.getElementById('cancelLoading').onclick = () => {
    loadingPopup.remove();
    loadingPopup = null;
  };
};

// Función para traducción parcial (futuro streaming)
function mostrarTraduccionParcial(translation, original, isPartial) {
  if (loadingPopup) {
    loadingPopup.remove();
    loadingPopup = null;
  }
  
  if (!popup) {
    mostrarTraduccion(translation, original);
  } else {
    // Actualizar popup existente
    const translationDiv = popup.querySelector('.translation-text');
    if (translationDiv) {
      translationDiv.textContent = translation;
    }
  }
}

// Función para escapar HTML
function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Detectar selección de texto para mostrar hint
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText && selectedText.length > 0) {
    // Mostrar hint sutil
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 9999;
      opacity: 0.9;
      animation: fadeOut 2s forwards;
    `;
    hint.textContent = '🌐 Haz clic derecho para traducir';
    document.body.appendChild(hint);
    
    setTimeout(() => hint.remove(), 2000);
  }
});

console.log('✅ Content.js listo y funcionando');