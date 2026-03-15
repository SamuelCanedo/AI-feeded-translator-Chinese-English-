import requests
import os
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

def translate_text(text, target_language):
    """
    Traduce texto usando DeepSeek API
    target_language: 'Chinese' o 'English'
    """
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {DEEPSEEK_API_KEY}'
    }
    
    data = {
        'model': 'deepseek-chat',
        'messages': [
            {
                'role': 'system',
                'content': f'You are a translator. Translate to {target_language}'
            },
            {
                'role': 'user',
                'content': text
            }
        ],
        'temperature': 0.1
    }
    
    try:
        response = requests.post(DEEPSEEK_URL, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        translation = result['choices'][0]['message']['content']
        return {'success': True, 'translation': translation}
    
    except Exception as e:
        return {'success': False, 'error': str(e)}

# También podemos hacer detección de idioma
def detect_language(text):
    """Detecta si el texto es principalmente chino o inglés"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {DEEPSEEK_API_KEY}'
    }
    
    data = {
        'model': 'deepseek-chat',
        'messages': [
            {
                'role': 'system',
                'content': 'Detect if this text is in Chinese or English. Respond with ONLY "Chinese" or "English".'
            },
            {
                'role': 'user',
                'content': text
            }
        ],
        'temperature': 0.1
    }
    
    try:
        response = requests.post(DEEPSEEK_URL, headers=headers, json=data)
        result = response.json()
        language = result['choices'][0]['message']['content'].strip()
        return language if language in ['Chinese', 'English'] else 'Unknown'
    except:
        return 'Unknown'