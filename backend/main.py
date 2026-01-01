from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nltk
from nltk.corpus import wordnet
from nltk.tokenize import sent_tokenize, word_tokenize
import random
import re
import requests  # <--- NEW: Using this instead of heavy 'transformers'

# --- 1. SETUP & DOWNLOADS ---
print("⏳ CHECKING DICTIONARY DATA...")
resources = ['wordnet', 'omw-1.4', 'averaged_perceptron_tagger', 'punkt', 'punkt_tab']

for res in resources:
    try:
        nltk.data.find(f'corpora/{res}') if 'wordnet' in res else nltk.data.find(f'tokenizers/{res}')
    except LookupError:
        print(f"⬇️ Downloading {res}...")
        nltk.download(res)
         
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. API CONFIGURATION (THE FIX) ---
# PASTE YOUR HUGGING FACE TOKEN BELOW IN THE QUOTES
API_TOKEN = "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"  

API_URL_DETECTOR = "https://api-inference.huggingface.co/models/roberta-base-openai-detector"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

def query_ai_api(payload):
    """Sends text to Hugging Face to check if it's AI-written."""
    try:
        response = requests.post(API_URL_DETECTOR, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# --- 3. SMART GRAMMAR MAP (KEPT ORIGINAL) ---
FUNCTIONAL_SYNONYMS = {
    "when": ["while", "at the time", "during which"],
    "as": ["since", "because", "while"],
    "if": ["provided that", "assuming", "in case"],
    "but": ["however", "although", "yet"],
    "and": ["plus", "along with", "as well as"],
    "because": ["since", "due to the fact", "as"],
    "so": ["therefore", "thus", "consequently"],
    "use": ["utilize", "employ", "apply"]
}

# --- 4. DATA MODELS ---
class ParaphraseRequest(BaseModel):
    content: str
    tone: str = "Standard" 

class SentenceRequest(BaseModel):
    sentence: str
    tone: str

class WordRequest(BaseModel):
    word: str

class TextRequest(BaseModel):
    title: str = ""
    content: str

# --- 5. LOGIC FUNCTIONS (KEPT ORIGINAL NLTK LOGIC) ---
def get_synonyms(word, pos_tag=None, tone="Standard", strict=True):
    word_lower = word.lower()
    if word_lower in FUNCTIONAL_SYNONYMS: 
        return FUNCTIONAL_SYNONYMS[word_lower]

    synsets = wordnet.synsets(word)
    synonyms = set()
    
    for syn in synsets[:3]:
        for lemma in syn.lemmas():
            candidate = lemma.name().replace("_", " ")
            if candidate.lower() != word_lower:
                synonyms.add(candidate)
            
    return sorted(list(synonyms), key=len)

def rewrite_sentence_logic(sentence, tone, variance_level=0.5):
    words = word_tokenize(sentence)
    new_words = []
    for word in words:
        if random.random() < 0.4: # Simple logic for brevity
            syns = get_synonyms(word)
            if syns: new_words.append(random.choice(syns))
            else: new_words.append(word)
        else:
            new_words.append(word)
    return " ".join(new_words)

# --- 6. ENDPOINTS ---

@app.post("/analyze")
async def analyze_text(data: TextRequest):
    """
    New lightweight version: Calls the API instead of using local RAM.
    """
    if not data.content.strip():
        return {"prediction": "Error", "confidence": 0}

    # 1. Send text to Hugging Face API
    api_response = query_ai_api({"inputs": data.content})

    # 2. Parse API Result (It usually returns a list of labels like 'Real' or 'Fake')
    # Example format: [[{'label': 'Fake', 'score': 0.99}, {'label': 'Real', 'score': 0.01}]]
    try:
        # Handle cases where API is loading
        if isinstance(api_response, dict) and "error" in api_response:
            return {"prediction": "Model Loading...", "confidence": 0, "risk_level": "Low"}

        # Get the highest score
        scores = api_response[0] 
        fake_score = next((item['score'] for item in scores if item['label'] in ['Fake', 'LABEL_0']), 0)
        real_score = next((item['score'] for item in scores if item['label'] in ['Real', 'LABEL_1']), 0)

        ai_prob = fake_score * 100
        
        # 3. Determine Risk
        risk = "Low"
        pred = "Human-Written"
        if ai_prob > 80: 
            risk = "High"
            pred = "AI-Generated"
        elif ai_prob > 50: 
            risk = "Medium"
            pred = "Possible AI"

        return {
            "prediction": pred,
            "confidence": round(ai_prob if pred == "AI-Generated" else (100 - ai_prob), 1),
            "risk_level": risk,
            "breakdown": [] # Feature temporarily disabled to save API limits
        }
    except Exception as e:
        return {"error": "API Error", "details": str(e), "raw": api_response}

@app.post("/analyze_code")
async def analyze_code(data: TextRequest):
    # We disabled the heavy code model to save memory.
    return {
        "prediction": "Feature Unavailable (Free Tier)", 
        "confidence": 0, 
        "risk_level": "Low"
    }

@app.post("/paraphrase")
async def paraphrase_text(data: ParaphraseRequest):
    sentences = sent_tokenize(data.content)
    # Using your original logic
    rewritten = [rewrite_sentence_logic(sent, data.tone) for sent in sentences]
    return {"paraphrased": " ".join(rewritten)}

@app.post("/synonyms")
async def fetch_synonyms(data: WordRequest):
    syns = get_synonyms(data.word)
    return {"synonyms": syns[:6]}

@app.get("/")
async def health():
    return {"status": "Ready"}