from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nltk
from nltk.corpus import wordnet
from nltk.tokenize import sent_tokenize, word_tokenize
import random
import requests

# --- 1. SETUP & DOWNLOADS ---
print("⏳ CHECKING DICTIONARY DATA...")
resources = ['wordnet', 'omw-1.4', 'averaged_perceptron_tagger', 'punkt', 'punkt_tab']
for res in resources:
    try:
        nltk.data.find(f'corpora/{res}') if 'wordnet' in res else nltk.data.find(f'tokenizers/{res}')
    except LookupError:
        nltk.download(res)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. API CONFIGURATION ---
# ✅ TOKEN (Your Token):
API_TOKEN = "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"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

# ✅ TEXT MODEL ONLY (We removed the Code model to be safe):
API_URL = "https://api-inference.huggingface.co/models/openai-community/roberta-base-openai-detector"

def query_huggingface(payload):
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# --- 3. LOGIC (Paraphraser) ---
FUNCTIONAL_SYNONYMS = {"when": ["while"], "as": ["since"], "if": ["provided that"], "but": ["however"], "so": ["therefore"]}

class TextRequest(BaseModel):
    content: str
class ParaphraseRequest(BaseModel):
    content: str
    tone: str = "Standard"
class WordRequest(BaseModel):
    word: str

def get_synonyms(word):
    if word.lower() in FUNCTIONAL_SYNONYMS: return FUNCTIONAL_SYNONYMS[word.lower()]
    synsets = wordnet.synsets(word)
    syns = set()
    for s in synsets[:3]:
        for l in s.lemmas():
            if l.name().lower() != word.lower(): syns.add(l.name().replace("_", " "))
    return list(syns)

def rewrite_sentence_logic(sentence, tone):
    words = word_tokenize(sentence)
    new_words = []
    for word in words:
        if random.random() < 0.4:
            syns = get_synonyms(word)
            new_words.append(random.choice(syns) if syns else word)
        else:
            new_words.append(word)
    return " ".join(new_words)

# --- 4. ENDPOINTS ---

@app.post("/analyze")
async def analyze_text(data: TextRequest):
    if not data.content.strip(): return {"prediction": "Error", "confidence": 0}
    
    # 1. Call API
    output = query_huggingface({"inputs": data.content})
    
    # 2. Check for "Model Loading" or Errors
    if isinstance(output, dict) and "error" in output:
        # If model is loading, return a polite message
        return {"prediction": "Model Waking Up...", "confidence": 0, "risk_level": "Low"}

    # 3. Parse Result
    try:
        # OpenAI Detector returns: [[{'label': 'Fake', 'score': 0.9}, {'label': 'Real', 'score': 0.1}]]
        scores = output[0] 
        fake_score = next((x['score'] for x in scores if x['label'] in ['Fake', 'LABEL_0']), 0)
        ai_prob = fake_score * 100
        
        pred = "AI-Generated" if ai_prob > 80 else "Human-Written"
        risk = "High" if ai_prob > 80 else "Low"
        
        return {"prediction": pred, "confidence": round(ai_prob if pred == "AI-Generated" else 100-ai_prob, 1), "risk_level": risk}
    except:
        return {"prediction": "API Error", "confidence": 0, "risk_level": "Low"}

@app.post("/analyze_code")
async def analyze_code(data: TextRequest):
    # 🛑 DISABLED to prevent crashes
    return {"prediction": "Feature Disabled", "confidence": 0, "risk_level": "Low"}

@app.post("/paraphrase")
async def paraphrase(data: ParaphraseRequest):
    sents = sent_tokenize(data.content)
    return {"paraphrased": " ".join([rewrite_sentence_logic(s, data.tone) for s in sents])}

@app.post("/synonyms")
async def synonyms(data: WordRequest):
    return {"synonyms": get_synonyms(data.word)[:6]}

@app.get("/")
async def health(): return {"status": "Ready"}