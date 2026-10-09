from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router
from routes.incidents import router as incidents_router

app = FastAPI(
    title="ABHEDYA Backend API",
    description="AI-assisted digital safety platform backend for women creators.",
    version="1.0.0"
)

# CORS configuration allowing frontend origin and deployment origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(analyze_router)
app.include_router(incidents_router)

@app.get("/")
def read_root():
    return {"message": "Abhedya backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
