# Hosting ReintegrAIt with real AI (Hugging Face Space)

This puts the whole prototype, including the real AI helper, at a public cloud URL such as
`https://bhav17-reintegrait.hf.space`. GitHub Pages can only show the simulated mode, because it cannot run `backend/server.py`.

## How it behaves

- **Anyone with the link** gets the full demo in simulated mode, the same as GitHub Pages.
- **Whoever enters the class passcode** at `/unlock` gets real speech-to-text and real note drafting in that browser for 7 days.
- **Daily limit:** after `DAILY_AI_LIMIT` real AI calls in a day (UTC), everyone falls back to simulated mode until midnight UTC. One recording uses about 2 calls.
- Keys live only in the Space's secret settings. They are never in GitHub and never sent to the browser.

## Set it up (about 10 minutes, once)

1. Go to https://huggingface.co/new-space.
   - Space name: `reintegrait`
   - SDK: **Docker**, template **Blank**
   - Hardware: **CPU basic (free)**
   - Visibility: **Public** (the grader must be able to open it)
   - Click **Create Space**.
2. In the Space, open **Files → + Add file → Create a new file**. Name it `Dockerfile`, paste the contents of [`Dockerfile`](Dockerfile) from this folder, and click **Commit**.
3. Open **Settings → Variables and secrets → New secret** and add three secrets:
   - `HF_TOKEN`: your Hugging Face token (the same one as in `backend/.env`)
   - `ANTHROPIC_API_KEY`: your Anthropic key
   - `DEMO_PASSCODE`: a passcode you choose, for example a short phrase. Share it only with your team.
4. Wait for the build (3 to 5 minutes, see the **Logs** tab). The app opens at `https://<your-username>-reintegrait.hf.space`.
5. Open `https://<your-username>-reintegrait.hf.space/unlock`, enter the passcode, and the AI switch in the top bar can turn on Real.

## Updating

The Space downloads the latest `main` from GitHub when it builds. After merging a change, open **Settings → Factory rebuild**.

## Notes

- A free Space goes to sleep after about 48 hours with no visitors and takes about 30 seconds to wake up. Open it a few minutes before presenting.
- Use made-up recordings only. Nothing real about a client should go into the hosted demo.
- To change the limit, add a variable `DAILY_AI_LIMIT` under **Settings → Variables and secrets**.
