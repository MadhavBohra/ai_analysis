from fastapi import FastAPI, HTTPException, Depends
from typing import Annotated, List
from sqlalchemy.orm import Session
from pydantic import BaseModel
import asyncio
import aiohttp
import google.generativeai as genai
import google.auth
import sys
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForSequenceClassification,AutoTokenizer,RobertaTokenizer
import torch
from transformers import pipeline
# Database and Model import
import models
from database import engine, SessionLocal
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv


sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

# Reading API keys from environment variables
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Checking if the API keys are being read correctly
if HUGGINGFACE_API_KEY is None:
    print("HUGGINGFACE_API_KEY not found!")
else:
    print("HUGGINGFACE_API_KEY loaded successfully.")

if GOOGLE_API_KEY is None:
    print("GOOGLE_API_KEY not found!")
else:
    print("GOOGLE_API_KEY loaded successfully.")
# API Credentials
API_URL = "https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"
HEADERS = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}  # Replace with actual key
  # Replace with actual key

# Configure Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

# FastAPI App
app = FastAPI()
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domain if needed: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Define Request Schema
class PromptRequest(BaseModel):
    promptText: str

class AnalyzeRequest(BaseModel):
    premiseText: str
    hypothesisText: str


# Asynchronous function to call DeepSeek API
async def deepSeekQuery(prompt):
    async with aiohttp.ClientSession() as session:
        async with session.post(API_URL, headers=HEADERS, json={"inputs": prompt}) as response:
            result = await response.json()

            if isinstance(result, list) and "generated_text" in result[0]:
                text = result[0]["generated_text"]

                # Extract "thinking process" (before </think>)
                thinking_text = text.split("</think>")[0].strip() if "</think>" in text else "No thinking process found."

                # Extract "final response" (after </think>)
                final_response = text.split("</think>")[-1].strip()

                return {
                    "model": "DeepSeek",
                    "thinking_process": thinking_text,
                    "response": final_response
                }

            return {"model": "DeepSeek", "error": "DeepSeek API call failed"}


# Asynchronous function to call Gemini API
async def geminiQuery(prompt):
    try:
        # await asyncio.sleep(60)  
        # # Simulate a long-running task
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = await asyncio.to_thread(model.generate_content, prompt)
        return {"model": "Gemini", "response": response.text}
    except Exception as e:
        return {"model": "Gemini", "error": str(e)}
    finally:
        google.auth.transport.grpc.secure_authorized_channel = None  # Force gRPC shutdown


# Function to get the fastest response
async def fastest_response(prompt):
    task1 = asyncio.create_task(deepSeekQuery(prompt))
    task2 = asyncio.create_task(geminiQuery(prompt))

    done, pending = await asyncio.wait([task1, task2], return_when=asyncio.FIRST_COMPLETED)

    for task in pending:
        try:
            task.cancel()
            await task  # Wait for cancellation to complete
        except asyncio.CancelledError:
            pass  # Ignore cancellation error

    return list(done)[0].result()  # Return the first completed result

VECTRA_MODEL_NAME = "vectara/hallucination_evaluation_model"
# tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
vectar_model = AutoModelForSequenceClassification.from_pretrained(VECTRA_MODEL_NAME, trust_remote_code=True)

EMOTION_MODEL_NAME = "SamLowe/roberta-base-go_emotions" 

emotion_tokenizer = AutoTokenizer.from_pretrained(EMOTION_MODEL_NAME)
emotion_model = AutoModelForSequenceClassification.from_pretrained(EMOTION_MODEL_NAME)

# Set Device (CPU or GPU)
device = "cuda" if torch.cuda.is_available() else "cpu"
vectar_model.to(device)
vectar_model.eval()  # Set model to evaluation mode
emotion_model.to(device)
emotion_model.eval()  # Set model to evaluation mode

# Function to Compute Hallucination Score
def get_hallucination_score(premise: str, hypothesis: str):
    try:
        # Forward Pass
        with torch.no_grad():
            outputs = vectar_model.predict([(premise, hypothesis)])

            

        # Extract Hallucination Score (Assuming index `1` corresponds to "Hallucinated")
        hallucination_score = outputs[0]

        print(hallucination_score)

        return round(float(hallucination_score), 3)

    except Exception as e:
        print(f"Error processing hallucination score: {e}")
        return None  # Handle API errors gracefully

# Function to Call Emotion Model
def get_emotion_scores(hypothesis:str):
    try:
        # ✅ Forward Pass
        classifier = pipeline(task="text-classification", model="SamLowe/roberta-base-go_emotions", top_k=None)
        tokenizer = RobertaTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")


        # Tokenize the input
        inputs = tokenizer(hypothesis, truncation=False, padding=False, return_tensors="pt")
        
        # Take the first 512 tokens (if the input is longer than 512)
        input_ids = inputs['input_ids'][0][:511]  # Take only the first 512 tokens

        # Convert token ids back to text
        truncated_text = tokenizer.decode(input_ids, skip_special_tokens=True)

        model_outputs = classifier(truncated_text)

        print(model_outputs)

            


        return model_outputs

    except Exception as e:
        print(f"Error processing emotion score: {e}")
        return None  # Handle API errors gracefully

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session,Depends(get_db)]     

# Pydantic Model for Request
class AnalysisResult(BaseModel):
    premiseText: str
    hypothesisText: str
    hallucination_score: float
    emotion_scores: dict

class HistoryResponse(BaseModel):
    id: int
    premise_text: str
    hypothesis_text: str
    hallucination_score: float
    emotion_scores: dict

    class Config:
        orm_mode = True

# FastAPI Route: Calls Both APIs and Returns the Fastest Response
@app.post("/generate/")
async def generate_text(request: PromptRequest):
    try:
        response = await fastest_response(request.promptText)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/analyze/")
async def analyze_text(request: AnalyzeRequest,db: db_dependency):
    premise = request.premiseText
    hypothesis = request.hypothesisText

    # Run API Calls in Parallel
    hallucination_task = get_hallucination_score(premise,hypothesis)
    # emotion_task = asyncio.create_task(get_emotion_scores(hypothesis))

    hallucination_score = hallucination_task
    print(hallucination_score)
    emotion_scores = get_emotion_scores(hypothesis)

    print(emotion_scores)

    # Handle potential API failures
    # if any one fails, return an error
    #  or emotion_scores is None
    if hallucination_score is None or emotion_scores is None:
        raise HTTPException(status_code=500, detail="Error processing the request.")


    new_result = models.AnalysisResult(
        premise_text=request.premiseText,
        hypothesis_text=request.hypothesisText,
        hallucination_score=hallucination_score,
        emotion_scores=emotion_scores, 
    )

    results = db.query(models.AnalysisResult).all()

    db.add(new_result)
    db.commit()
    db.refresh(new_result) # fetches the id

    # Return JSON Response
    return {
        "hallucination_score": hallucination_score,
        "emotion_scores": emotion_scores,
        "id": new_result.id,
        "hallucination_scores": [result.hallucination_score for result in results],
    }

@app.get("/history/", response_model=List[HistoryResponse])
async def get_history(db: db_dependency):
    # Query all rows from the analysis_results table
    results = db.query(models.AnalysisResult).all()

    if not results:
        raise HTTPException(status_code=404, detail="No analysis results found.")

    for result in results:
        # Assuming emotion_scores is a list of dictionaries like [{'label': 'neutral', 'score': 0.7}, ...]
        emotion_scores_dict = {emotion['label']: emotion['score'] for emotion in result.emotion_scores[0]}
        result.emotion_scores = emotion_scores_dict

    return results