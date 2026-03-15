async function checkServer() {
  try {
    const response = await fetch('http://127.0.0.1:5000/health');
    const statusDiv = document.getElementById('status');
    
    if (response.ok) {
      statusDiv.className = 'status running';
      statusDiv.textContent = '✅ Servidor Python activo';
    } else {
      statusDiv.className = 'status stopped';
      statusDiv.textContent = '❌ Servidor no responde';
    }
  } catch {
    const statusDiv = document.getElementById('status');
    statusDiv.className = 'status stopped';
    statusDiv.textContent = '❌ Servidor no encontrado';
  }
}

checkServer();
// Revisar cada 5 segundos
setInterval(checkServer, 5000);