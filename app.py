from flask import Flask, request, jsonify
from flask_cors import CORS
from translator import translate_text, detect_language
import hashlib
import time

app = Flask(__name__)
CORS(app)  # Permite que la extensión se conecte

# Caché simple en memoria
cache = {}
CACHE_TTL = 3600  # 1 hora en segundos

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    target = data.get('target', '')  # 'Chinese' o 'English'
    
    if not text or not target:
        return jsonify({'error': 'Missing text or target'}), 400
    
    # Generar clave única basada en texto y target
    cache_key = hashlib.md5(f"{text}:{target}".encode()).hexdigest()
    
    # Verificar si está en caché
    if cache_key in cache:
        cached_time, cached_result = cache[cache_key]
        if time.time() - cached_time < CACHE_TTL:
            print(f'⚡ Usando caché para: "{text[:30]}..."')
            return jsonify(cached_result)
    
    # Si no está en caché, llamar a DeepSeek
    print(f'🌐 Llamando a DeepSeek para: "{text[:30]}..."')
    result = translate_text(text, target)
    
    # Guardar en caché si fue exitoso
    if result.get('success'):
        cache[cache_key] = (time.time(), result)
        print(f'💾 Guardado en caché')
    
    return jsonify(result)

@app.route('/auto-translate', methods=['POST'])
def auto_translate():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'Missing text'}), 400
    
    # Generar clave para caché (incluye detección)
    cache_key = hashlib.md5(f"auto:{text}".encode()).hexdigest()
    
    # Verificar caché
    if cache_key in cache:
        cached_time, cached_result = cache[cache_key]
        if time.time() - cached_time < CACHE_TTL:
            print(f'⚡ Usando caché auto para: "{text[:30]}..."')
            return jsonify(cached_result)
    
    # Detectar idioma
    source_lang = detect_language(text)
    target = 'English' if source_lang == 'Chinese' else 'Chinese'
    
    print(f'🌐 Auto-detectado: {source_lang} → {target}')
    
    # Traducir
    result = translate_text(text, target)
    result['source_language'] = source_lang
    result['target_language'] = target
    
    # Guardar en caché
    if result.get('success'):
        cache[cache_key] = (time.time(), result)
    
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    # Mostrar estadísticas de caché
    cache_size = len(cache)
    return jsonify({
        'status': 'ok',
        'cache_size': cache_size,
        'cache_keys': list(cache.keys())[:5]  # Solo mostrar las primeras 5 para debug
    })

@app.route('/cache/stats', methods=['GET'])
def cache_stats():
    """Endpoint para ver estadísticas de caché"""
    return jsonify({
        'total_entries': len(cache),
        'cache_keys': list(cache.keys()),
        'cache_ttl': CACHE_TTL
    })

@app.route('/cache/clear', methods=['POST'])
def cache_clear():
    """Endpoint para limpiar la caché manualmente"""
    global cache
    cache = {}
    return jsonify({'message': 'Caché limpiada', 'status': 'ok'})

if __name__ == '__main__':
    print("🚀 Servidor iniciado en http://127.0.0.1:5000")
    print("📝 Caché activada - Las traducciones repetidas serán instantáneas")
    print("⏰ TTL de caché: 1 hora")
    app.run(host='127.0.0.1', port=5000, debug=True)