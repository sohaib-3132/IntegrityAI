from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nltk
from nltk.corpus import wordnet
from nltk.tokenize import sent_tokenize, word_tokenize
import random
import requests
from duckduckgo_search import DDGS # <--- NEW SEARCH TOOL

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

# --- 2. CONFIGURATION ---
API_TOKEN = "PASTE YOUR TOKEN HERE" # Keep your token
headers = {"Authorization": f"Bearer {API_TOKEN}"}
API_URL = "https://api-inference.huggingface.co/models/openai-community/roberta-base-openai-detector"

def query_huggingface(payload):
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# --- 3. LOGIC ---
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

# --- NEW: PLAGIARISM CHECKER LOGIC ---
def search_web_for_sentence(sentence):
    """Searches DuckDuckGo for the sentence. Returns URL if exact match found."""
    # We strip quotes to avoid search errors, but ideally we search "in quotes" for exact match.
    # For a free tool, we just search the text.
    if len(sentence) < 30: return None # Skip short phrases like "Hello world"
    
    try:
        with DDGS() as ddgs:
            # We request 1 result. If the snippet matches well, we return it.
            results = list(ddgs.text(sentence, max_results=1))
            if results:
                return {"source": results[0]['href'], "title": results[0]['title']}
    except Exception as e:
        print(f"Search Error: {e}")
    return None

# --- 4. ENDPOINTS ---

@app.post("/check_plagiarism")
async def check_plagiarism(data: TextRequest):
    sentences = sent_tokenize(data.content)
    # LIMITATION: To prevent timeouts on free servers, we only check first 5-10 sentences 
    # or limit total text length.
    matches = []
    
    # Check max 10 sentences for demo speed
    sentences_to_check = sentences[:10] 
    
    for i, sent in enumerate(sentences_to_check):
        result = search_web_for_sentence(sent)
        if result:
            matches.append({
                "sentence_index": i,
                "text": sent,
                "source_url": result['source'],
                "source_title": result['title']
            })
            
    return {"matches": matches, "total_sentences": len(sentences)}

@app.post("/analyze")
async def analyze_text(data: TextRequest):
    if not data.content.strip(): return {"prediction": "Error", "confidence": 0}
    output = query_huggingface({"inputs": data.content})
    if isinstance(output, dict) and "error" in output:
        return {"prediction": "Model Waking Up...", "confidence": 0, "risk_level": "Low"}
    try:
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
