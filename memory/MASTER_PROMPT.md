# Rebuild Prompt

Build MOSAICO, a full-stack app for private online Spanish lessons.

Use:

- React frontend
- FastAPI backend
- Supabase Postgres for persistent data
- Supabase Auth with Google OAuth
- Supabase Storage for image uploads
- Stripe Checkout for payments
- Render for deployment

Backend requirements:

- All API routes live under `/api`.
- Read secrets from environment variables.
- Never commit `.env` files or secret keys.
- Apply `schema.sql` on startup.
- Seed products, blog posts, availability, and a default teacher only when those tables are empty.
- Verify Supabase access tokens before protected routes.
- Use admin email allow-list for initial admin role assignment.

Frontend requirements:

- Use Supabase Auth client for sign-in/sign-out.
- Send Supabase access tokens to the backend as bearer tokens.
- Use `REACT_APP_BACKEND_URL`, `REACT_APP_SUPABASE_URL`, and `REACT_APP_SUPABASE_ANON_KEY`.
