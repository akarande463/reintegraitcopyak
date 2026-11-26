# Suggesting changes to ReintegrAIt

Thanks for testing the prototype. Changes and comments come in as pull requests (PRs) or issues, and Bhav reviews each one before it goes into `main`.

## Try it first

- **No setup:** open the live demo at https://bhav17.github.io/reintegrait/. It runs in simulated mode, so no API key is needed and nothing you do leaves your browser.
- **On your laptop:** follow `app/step1-client-note/README.md`. `python3 -m http.server 8000` in that folder is enough for the demo.

## Leave a comment (no code)

Open an issue: the **Issues** tab, then **New issue**. Say which screen, what you did, what you expected and what happened. A screenshot helps.

## Send a change as a pull request

You can't push to `main` directly. Every change goes through a PR.

**If you are a collaborator on the repo:**
1. `git checkout -b your-name/short-description`
2. Make the change, then `git commit -am "What you changed"`
3. `git push -u origin your-name/short-description`
4. On GitHub, click **Compare & pull request** and describe the change.

**If you are not a collaborator:**
1. Click **Fork** at the top of the repo page.
2. Make the change in your fork, on a new branch.
3. Click **Contribute**, then **Open pull request**.

Small edits, such as a typo in a doc, can be made straight on GitHub: open the file, click the pencil icon and choose **Propose changes**. GitHub makes the PR for you.

## Rules

- **Never commit API keys.** Keys go only in `app/step1-client-note/backend/.env`, which git ignores. Use `.env.example` as the template.
- **No real client data.** Use only made-up people in recordings, sample documents and notes.
- Run the tests in `app/step1-client-note/README.md` before you send a code change, and say in the PR whether they pass.
