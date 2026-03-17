# Deployment

This project is set up to deploy as a single Node service.

## Hostinger

Hostinger now supports Node.js Web Apps on Business and Cloud plans, and supports React and Express.js with Node.js versions `18.x`, `20.x`, `22.x`, and `24.x`. GitHub import is the recommended deployment path, and ZIP upload is also supported.

This project is prepared for Hostinger with root-level scripts in [package.json](/d:/PROGRAM/New%20folder/package.json).

### Recommended setup in hPanel

1. Push the repository to GitHub.
2. In Hostinger hPanel, go to `Websites` -> `Add Website` -> `Node.js Apps`.
3. Choose `Import Git Repository`.
4. Select this repository and branch.
5. Use Node.js `22.x`.
6. If Hostinger asks for build/start commands, use:

```bash
npm run build
```

```bash
npm start
```

7. Add environment variable:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1-mini`

### ZIP upload option

If you do not want to use GitHub, upload a ZIP of the project root.

Include:

- `backend/`
- `frontend/`
- [package.json](/d:/PROGRAM/New%20folder/package.json)

Exclude:

- `backend/node_modules`
- `frontend/node_modules`
- `frontend/build`

### Production behavior

- the backend serves the React build automatically
- the frontend uses `/api` in production
- open the deployed domain directly; you do not need separate frontend/backend URLs

## Recommended platform

Render is the simplest option for the current structure because:

- the backend serves the React build in production
- the API and UI stay on the same origin
- no separate frontend hosting is required

## Before deploying

Set these environment variables on the host:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1-mini` (optional, already defaulted)

## Render

1. Push this project to GitHub.
2. Create a new Render Blueprint or Web Service from the repo.
3. Render will detect [render.yaml](/d:/PROGRAM/New%20folder/render.yaml).
4. Add `OPENAI_API_KEY` in Render environment settings.
5. Deploy.

## Local production-style run

```bash
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend
npm start --prefix backend
```

Then open `http://localhost:4000`.

## Important note

The app currently stores workflow and log data in [workflows.json](/d:/PROGRAM/New%20folder/backend/data/workflows.json). On many cloud hosts, local disk is ephemeral, so data may reset on redeploy or restart. If you want durable deployment, the next step is moving this store to a database.
