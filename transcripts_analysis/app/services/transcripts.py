from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Transcript:
    def __init__(self, video_id: str):
        self.video_id = video_id
    def get(self) -> dict:
        try:
            try:
                ytt_api = YouTubeTranscriptApi()
                fetched_transcript = ytt_api.fetch(self.video_id, languages=['en', 'fr', 'es', 'pt'])
                full_text = " ".join([snippet.text for snippet in fetched_transcript])
                return {
                    "success": True,
                    "video_transcript": {
                        "video_id": self.video_id,
                        "text": full_text
                    }}
            except NoTranscriptFound:
                logging.error(f"Skipping {self.video_id}: No English transcript available.")
                return None
            except Exception as e:
                logging.error(f"An error occurred: {e}")
                return None
        except Exception as e:
            logging.error(f"Error accessing transcript: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "video_id": self.video_id
            }

# transcript["video_transcript"]["text"]

if __name__ == "__main__":
    transcript = Transcript(video_id="IDy2SxjMOFM").get()
    logging.info(f"{transcript["video_transcript"]["text"][:100]}")