from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline, GPT2LMHeadModel, GPT2TokenizerFast
import torch
import nltk
from nltk.corpus import wordnet
from nltk.tokenize import sent_tokenize, word_tokenize
import random
import re

# --- 1. SETUP & DOWNLOADS ---
print("⏳ CHECKING DICTIONARY DATA...")
resources = [
    'wordnet', 
    'omw-1.4', 
    'averaged_perceptron_tagger', 
    'averaged_perceptron_tagger_eng', 
    'punkt', 
    'punkt_tab'
]

for res in resources:
    try:
        if 'wordnet' in res or 'omw' in res:
            nltk.data.find(f'corpora/{res}')
        elif 'tagger' in res:
            nltk.data.find(f'taggers/{res}')
        else:
            nltk.data.find(f'tokenizers/{res}')
            
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

# --- 2. CONFIG & AI MODELS ---
device = 0 if torch.cuda.is_available() else -1
torch_device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"✅ RUNNING ON: {torch_device.upper()}")

try:
    classifier = pipeline("text-classification", model="roberta-large-openai-detector", device=device)
    perplexity_model = GPT2LMHeadModel.from_pretrained("gpt2").to(torch_device)
    perplexity_tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
except Exception as e:
    print(f"⚠️ Model Warning: {e}")
    classifier = None
    perplexity_model = None

# --- 3. SMART GRAMMAR MAP ---
FUNCTIONAL_SYNONYMS = {
    "when": ["while", "at the time", "during which", "as soon as"],
    "as": ["since", "because", "while", "in the role of"],
    "the": ["this", "that", "said", "the specific"],
    "if": ["provided that", "assuming", "in case", "whether"],
    "but": ["however", "although", "yet", "nevertheless"],
    "and": ["plus", "along with", "as well as", "together with"],
    "or": ["alternatively", "conversely", "on the other hand"],
    "because": ["since", "due to the fact", "as", "owing to"],
    "so": ["therefore", "thus", "consequently", "hence"],
    "with": ["alongside", "using", "accompanied by"],
    "without": ["lacking", "void of", "minus", "free from"],
    "to": ["towards", "in the direction of", "until"],
    "for": ["on behalf of", "in favor of", "intended for"],
    "is": ["remains", "exists as", "constitutes", "represents"],
    "are": ["remain", "exist as", "constitute", "represent"],
    "was": ["remained", "existed as", "constituted"],
    "very": ["extremely", "highly", "exceedingly", "truly"],
    "good": ["excellent", "beneficial", "favorable", "positive"],
    "bad": ["negative", "detrimental", "poor", "adverse"],
    "use": ["utilize", "employ", "apply", "leverage"]
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

# --- 5. LOGIC FUNCTIONS ---
def get_synonyms(word, pos_tag=None, tone="Standard", strict=True):
    word_lower = word.lower()
    synonyms = set()
    
    # 1. Check functional synonyms first (manual list)
    if word_lower in FUNCTIONAL_SYNONYMS: 
        return FUNCTIONAL_SYNONYMS[word_lower]

    # 2. Map NLTK POS tags to WordNet POS tags
    wn_tag = None
    if pos_tag:
        if pos_tag.startswith('J'): wn_tag = wordnet.ADJ
        elif pos_tag.startswith('V'): wn_tag = wordnet.VERB
        elif pos_tag.startswith('N'): wn_tag = wordnet.NOUN
        elif pos_tag.startswith('R'): wn_tag = wordnet.ADV

    # 3. Fetch Synsets (Filter by POS if we have a tag)
    if wn_tag:
        synsets = wordnet.synsets(word, pos=wn_tag)
    else:
        # Fallback: if no tag is provided, grab everything (old behavior)
        synsets = wordnet.synsets(word)

    most_common_synsets = synsets[:3] 

    for syn in most_common_synsets:
        for lemma in syn.lemmas():
            candidate = lemma.name().replace("_", " ")
            if candidate.lower() == word_lower: continue
            
            # Strict mode filters
            if strict:
                if tone == "Fluent" or tone == "Standard":
                    if len(candidate) > len(word) + 5: continue
                elif tone == "Formal":
                    if len(candidate) < 4: continue 
            
            synonyms.add(candidate)
            
    return sorted(list(synonyms), key=len)

def rewrite_sentence_logic(sentence, tone, variance_level=0.5):
    # 1. Tokenize words
    words = word_tokenize(sentence)
    
    # 2. Get Part of Speech tags for the whole sentence
    # Output example: [('I', 'PRP'), ('book', 'VBP'), ('a', 'DT'), ('flight', 'NN')]
    tagged_words = nltk.pos_tag(words)

    new_words = []
    
    # 3. Loop through words WITH their tags
    for word, tag in tagged_words:
        clean_word = re.sub(r'[^\w\s]', '', word)
        word_lower = clean_word.lower()
        is_functional = word_lower in FUNCTIONAL_SYNONYMS
        
        # Skip short words unless they are functional
        if len(clean_word) < 3 and not is_functional:
            new_words.append(word)
            continue
            
        swap_prob = 0.4 if tone != "Fluent" else 0.5
        
        if random.random() < (swap_prob * variance_level):
            # PASS THE TAG HERE
            syns = get_synonyms(clean_word, pos_tag=tag, tone=tone, strict=True)
            
            if syns:
                replacement = random.choice(syns)
                if word[0].isupper(): replacement = replacement.capitalize()
                new_words.append(replacement)
            else:
                new_words.append(word)
        else:
            new_words.append(word)
            
    reconstructed = " ".join(new_words)
    return re.sub(r'\s+([?.!,:;])', r'\1', reconstructed)

# --- 6. ENDPOINTS ---

@app.post("/paraphrase")
async def paraphrase_text(data: ParaphraseRequest):
    sentences = sent_tokenize(data.content)
    rewritten_sentences = [rewrite_sentence_logic(sent, data.tone, variance_level=1.5) for sent in sentences]
    return {"paraphrased": " ".join(rewritten_sentences)}

@app.post("/rewrite_sentence")
async def fetch_sentence_variants(data: SentenceRequest):
    variants = []
    for _ in range(5):
        var = rewrite_sentence_logic(data.sentence, data.tone, variance_level=1.8)
        if var not in variants and var != data.sentence:
            variants.append(var)
            
    # Fallback if no good variations were found
    if not variants:
        variants = ["Could not generate a distinct variation."]
        
    return {"variants": variants[:3]}

@app.post("/synonyms")
async def fetch_synonyms(data: WordRequest):
    syns = get_synonyms(data.word, "Standard", strict=False)
    return {"synonyms": syns[:6]}

@app.post("/analyze")
async def analyze_text(data: TextRequest):
    if classifier is None: return {"prediction": "Error", "confidence": 0, "risk_level": "None"}
    
    try:
        # A. GLOBAL SCORE
        result = classifier(data.content)[0]
        score = result['score']
        label = result['label']
        ai_prob = score * 100 if label in ['Fake', 'LABEL_0'] else (1 - score) * 100
        
        # Perplexity
        enc = perplexity_tokenizer(data.content, return_tensors="pt")
        inp = enc.input_ids.to(torch_device)
        with torch.no_grad():
            ppl = torch.exp(perplexity_model(inp, labels=inp).loss).item()

        pred, risk, conf = "Human-Written", "Low", 100 - ai_prob
        if ai_prob > 80: pred, risk, conf = "AI-Generated", "High", ai_prob
        elif ppl < 25: pred, risk, conf = "Suspected AI (Modern)", "High", 88.5
        elif ppl < 45: pred, risk, conf = "Possible AI Edit", "Medium", 65.0
        
        # B. SENTENCE-LEVEL "X-RAY" BREAKDOWN
        sentences = sent_tokenize(data.content)
        breakdown = []
        
        for sent in sentences:
            if len(sent) < 5: 
                breakdown.append({"text": sent, "risk": "Low", "prob": 0})
                continue
                
            res = classifier(sent)[0]
            s_score = res['score']
            s_label = res['label']
            s_ai_prob = s_score * 100 if s_label in ['Fake', 'LABEL_0'] else (1 - s_score) * 100
            
            s_risk = "Low"
            if s_ai_prob > 80: s_risk = "High"
            elif s_ai_prob > 50: s_risk = "Medium"
            
            breakdown.append({"text": sent, "risk": s_risk, "prob": round(s_ai_prob, 1)})

        return {
            "prediction": pred, "confidence": round(conf, 1), "risk_level": risk,
            "breakdown": breakdown  # <--- NEW DATA
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
async def health():
    return {"status": "Ready"}