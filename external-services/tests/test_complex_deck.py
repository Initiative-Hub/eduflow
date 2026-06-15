import json
import time
import requests

BASE_URL = "http://localhost:8000"


def test_complex_deck_generation():
    print("Sending complex slide plan to /slides/generate-from-plan...")

    payload = {
        "title": "Neon Dark Image Test",
        "palette": "auto",
        "slides": [
            {
                "category": "TITLE_SLIDE",
                "slideTitle": "Scaling APIs with S3 & Images",
                "bindings": {
                    "subtitle": "Performance, Reliability & Vector Visuals",
                    "author": "EduFlow Platform Engineering",
                },
            },
            {
                "category": "MEDIA_TEXT",
                "slideTitle": "High-End Image Generation",
                "bindings": {
                    "image_prompt_description": "An electric cyan computer chip glowing on a dark space blueprint",
                    "body_text": "This slide features an inline generated visual element produced dynamically through S3 storage and AI pipelines.",
                },
            },
            {
                "category": "CONCLUSION_SUMMARY",
                "slideTitle": "Key Takeaways",
                "bindings": {
                    "summary_points": [
                        "DALL-E images are automatically base64-inlined into SVGs.",
                        "SVG placeholders act as robust, style-matched fallbacks when API limits hit.",
                    ]
                },
            },
        ],
    }

    # 1. Post to generate endpoint
    resp = requests.post(f"{BASE_URL}/slides/generate-from-plan", json=payload)
    if resp.status_code != 200:
        print(f"Error starting job: {resp.status_code} - {resp.text}")
        return

    job_data = resp.json()
    job_id = job_data["job_id"]
    print(f"Job queued successfully. Job ID: {job_id}")

    # 2. Poll the job status until done
    for attempt in range(30):
        print(f"Polling job status (attempt {attempt + 1})...")
        status_resp = requests.get(f"{BASE_URL}/slides/jobs/{job_id}")
        if status_resp.status_code != 200:
            print(f"Error polling job: {status_resp.status_code} - {status_resp.text}")
            return

        status_data = status_resp.json()
        status = status_data["status"]
        print(f"Current Status: {status}")

        if status == "done":
            print("\nJob completed successfully!")
            print(f"Result S3 Key: {status_data['result'].get('s3_key')}")
            print(f"Slides generated: {len(status_data['result'].get('slides', []))}")
            break
        elif status == "error":
            print(f"Job failed with error: {status_data.get('message')}")
            return

        time.sleep(2)
    else:
        print("Timeout waiting for job completion.")
        return

    # 3. Retrieve the generated slide deck
    print(f"Fetching generated deck from /slides/decks/{job_id}...")
    deck_resp = requests.get(f"{BASE_URL}/slides/decks/{job_id}")
    if deck_resp.status_code == 200:
        print(f"Deck fetched successfully! Response size: {len(deck_resp.text)} bytes")
    else:
        print(f"Error fetching deck: {deck_resp.status_code} - {deck_resp.text}")


if __name__ == "__main__":
    test_complex_deck_generation()
