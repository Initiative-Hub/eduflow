import time
import requests

BASE_URL = "http://localhost:8000"


def test_complex_deck_generation():
    print("Sending complex slide plan to /slides/generate-from-plan...")

    payload = {
        "title": "Comprehensive Neon Dark Deck Test",
        "palette": "auto",
        "slides": [
            {
                "category": "TITLE_SLIDE",
                "slideTitle": "Platform Architecture 2026",
                "bindings": {
                    "subtitle": "Next-Gen EduFlow Infrastructure Stack",
                    "author": "EduFlow Platform Engineering Team",
                },
            },
            {
                "category": "AGENDA_OUTLINE",
                "slideTitle": "Agenda & Outline",
                "bindings": {
                    "items": [
                        "Microservice Containerization",
                        "Database Migration Pipelines",
                        "Asynchronous Job Handlers",
                        "Vector Slide Template Libraries",
                        "Interactive QA Session",
                    ]
                },
            },
            {
                "category": "SECTION_HEADER",
                "slideTitle": "Part I: Core Microservices",
                "bindings": {"sub_module_name": "Docker & Storage Setup"},
            },
            {
                "category": "TITLE_BULLETS",
                "slideTitle": "Why Containerization Matters",
                "bindings": {
                    "bullets": [
                        "Consistent development environment across all systems.",
                        "Isolated networks for storage and transactional DBs.",
                        "Fast horizontal scaling with minimal cold start overhead.",
                        "Secure credentials using Docker Secrets and ENV injection.",
                    ]
                },
            },
            {
                "category": "TWO_COLUMN_SPLIT",
                "slideTitle": "Monolith vs. Microservice",
                "bindings": {
                    "left_col_title": "Legacy Monolith App",
                    "left_col_text": [
                        "Slow release and test suites.",
                        "Tightly-coupled data entities.",
                        "High memory footprint during build.",
                    ],
                    "right_col_title": "Modern Microservice",
                    "right_col_text": [
                        "Independent container deploy.",
                        "Strict API contract boundaries.",
                        "Scale hotspots on-demand dynamically.",
                    ],
                },
            },
            {
                "category": "BIG_QUOTE_TAKEAWAY",
                "slideTitle": "Architectural Principle",
                "bindings": {
                    "quote": "Complexity is the enemy of reliability. Keeping microservices focused and templates deterministic guarantees stability.",
                    "author_or_source": "EduFlow CTO Office",
                },
            },
            {
                "category": "KPI_BIG_NUMBER",
                "slideTitle": "Infrastructure Performance",
                "bindings": {
                    "metrics": [
                        {"value": "99.99%", "label": "Service Uptime SLA"},
                        {"value": "15ms", "label": "Median DB Query Time"},
                        {"value": "450k", "label": "Concurrent WebSocket Feeds"},
                    ]
                },
            },
            {
                "category": "CHART_INSIGHT",
                "slideTitle": "Resource Consumption Scaling",
                "bindings": {
                    "chart_type": "bar",
                    "chart_data": [
                        {"label": "Q1 2025", "value": 150},
                        {"label": "Q2 2025", "value": 280},
                        {"label": "Q3 2025", "value": 410},
                        {"label": "Q4 2025", "value": 590},
                    ],
                    "insight_text": "CPU utilization remains linear with user requests thanks to aggressive server-side caching.",
                },
            },
            {
                "category": "DATA_TABLE",
                "slideTitle": "Deployment Target Matrix",
                "bindings": {
                    "headers": ["Region", "Cluster Type", "Nodes", "Status"],
                    "rows": [
                        ["us-east-1", "Kubernetes", "12", "Healthy"],
                        ["ap-southeast-1", "ECS Fargate", "8", "Healthy"],
                        ["eu-central-1", "Bare Metal", "16", "Maintenance"],
                    ],
                },
            },
            {
                "category": "MEDIA_TEXT",
                "slideTitle": "AI Image Synthesis",
                "bindings": {
                    "image_prompt_description": "An aesthetic cyber neon server room illustration in synthwave style",
                    "body_text": "This slide features an inline generated visual element produced dynamically through S3 storage and AI pipelines.",
                },
            },
            {
                "category": "TIMELINE_MILESTONES",
                "slideTitle": "Implementation Roadmap",
                "bindings": {
                    "events": [
                        {
                            "date_or_step": "Phase 1",
                            "description": "Prisma schema stabilization",
                        },
                        {
                            "date_or_step": "Phase 2",
                            "description": "Better Auth integration",
                        },
                        {
                            "date_or_step": "Phase 3",
                            "description": "Microservice rollout",
                        },
                        {
                            "date_or_step": "Phase 4",
                            "description": "Multi-region replication",
                        },
                    ]
                },
            },
            {
                "category": "STEP_BY_STEP",
                "slideTitle": "Deployment Checklist",
                "bindings": {
                    "steps": [
                        "Run DB migrations.",
                        "Pre-generate template SVGs.",
                        "Rebuild Docker service.",
                        "Trigger health check.",
                    ]
                },
            },
            {
                "category": "CONCLUSION_SUMMARY",
                "slideTitle": "Key Summary",
                "bindings": {
                    "summary_points": [
                        "All 16 slide categories are fully modular and template-backed.",
                        "Nest array structures flatten smoothly inside Python slide service.",
                        "Docker compose orchestrates all background tasks seamlessly.",
                        "Testing ensures high design taste compliance.",
                    ]
                },
            },
            {
                "category": "CALL_TO_ACTION",
                "slideTitle": "Next Action Plan",
                "bindings": {
                    "action_items": [
                        "Review current system test logs.",
                        "Merge template library branch.",
                        "Audit Figma design alignments.",
                        "Conduct stress test dry-run.",
                    ]
                },
            },
            {
                "category": "QA_CONTACT",
                "slideTitle": "Q&A Session",
                "bindings": {
                    "footer_note": "Contact support@eduflow.example.com for infrastructure access queries."
                },
            },
            {
                "category": "REFERENCES_LIST",
                "slideTitle": "References & Literature",
                "bindings": {
                    "sources": [
                        {
                            "title": "Prisma Query Engine Docs",
                            "url": "https://www.prisma.io/docs",
                        },
                        {
                            "title": "Astral UV Python Package Mgr",
                            "url": "https://github.com/astral-sh/uv",
                        },
                        {
                            "title": "Docker Compose V2 Spec",
                            "url": "https://docs.docker.com/",
                        },
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
