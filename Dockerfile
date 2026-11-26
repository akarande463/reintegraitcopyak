# ReintegrAIt on a Hugging Face Space (Docker). Paste this file into the Space as "Dockerfile".
# It downloads the latest main branch from GitHub at build time, so to deploy new code:
# Space → Settings → Factory rebuild.
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ffmpeg \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user

# Changes whenever main gets a new commit, so a rebuild always pulls the newest code.
ADD https://api.github.com/repos/bhav17/reintegrait/git/refs/heads/main /tmp/main-version.json
RUN git clone --depth 1 https://github.com/bhav17/reintegrait.git repo

WORKDIR /home/user/repo/app/step1-client-note
RUN pip install --no-cache-dir --user anthropic

# Keys come from the Space's secrets: HF_TOKEN, ANTHROPIC_API_KEY, DEMO_PASSCODE.
# DAILY_AI_LIMIT caps real AI calls per day for all visitors together.
ENV HOST=0.0.0.0 PORT=7860 DAILY_AI_LIMIT=60
EXPOSE 7860
CMD ["python3", "backend/server.py"]
