# ─── Python FastAPI server (unchanged except for clarifying comments) ──────────
 
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
from typing import Optional
import logging
import numpy as np
import librosa
 
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
 
app = FastAPI()
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
class TextInput(BaseModel):
    text: str
    lang: str = Field(default='en', description='Language code (e.g., en, de, es, fr, it, pt)')
    volume: float = Field(default=1.0, ge=0.0, description='Volume multiplier (0.0 to 2.0)')
    rate: float = Field(default=1.0, ge=0.1, description='Speech rate multiplier')
 
@app.post("/tts")
async def text_to_speech(request: TextInput):
    try:
        from gtts import gTTS
        from pydub import AudioSegment
 
        tts = gTTS(text=request.text, lang=request.lang)
 
        mp3_buffer = io.BytesIO()
        tts.write_to_fp(mp3_buffer)
        mp3_buffer.seek(0)
 
        audio = AudioSegment.from_file(mp3_buffer, format="mp3")
 
        if request.volume != 1.0:
            change_db = 20 * np.log10(request.volume) if request.volume > 0 else -100
            audio = audio + change_db
 
        if request.rate != 1.0:
            audio_array = np.array(audio.get_array_of_samples(), dtype=np.float32)
            if audio.channels == 2:
                audio_array = audio_array.reshape((-1, 2)).T
            else:
                audio_array = audio_array.reshape((1, -1))
 
            audio_array = audio_array / 32768.0
            stretched_audio = librosa.effects.time_stretch(audio_array, rate=request.rate)
            stretched_audio = (stretched_audio * 32768).astype(np.int16)
            if stretched_audio.ndim == 2:
                stretched_audio = stretched_audio.T.flatten()
 
            audio = audio._spawn(stretched_audio.tobytes())
            audio = audio.set_frame_rate(audio.frame_rate)
 
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format="mp3")
        output_buffer.seek(0)
 
        logging.info(f"TTS generated for text (len={len(request.text)}, lang={request.lang}, vol={request.volume}, rate={request.rate})")
        return StreamingResponse(output_buffer, media_type="audio/mpeg")
 
    except Exception as e:
        logging.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")
 
if __name__ == "__main__":
    import uvicorn
    # FIX: Run as plain HTTP (no ssl_keyfile/ssl_certfile).
    # The Qt client connects over http://, so the server must not use TLS.
    uvicorn.run(app, host="0.0.0.0", port=5000)
