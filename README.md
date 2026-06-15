This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Local login defaults:

- User: `admin`
- Password: `forseti2026`

Override them with `APP_LOGIN_USER`, `APP_LOGIN_PASSWORD`, and optionally `APP_SESSION_SECRET`.

Password recovery email requires:

- `RESEND_API_KEY`
- `APP_RECOVERY_EMAIL`
- `APP_FROM_EMAIL` (optional)

## Environment variables

Create a local `.env` from `.env.example`.

### Google Sheets / Drive for production

Preferred secret:

```env
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64="..."
```

Supported alternatives:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_CREDENTIALS_JSON`
- `GOOGLE_CREDENTIALS`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Notes:

- The service account must have access to the target Google Sheet as **Editor**.
- If Google Drive is used to read monthly PDFs, the same service account must also have access to the relevant Drive folders/files.
- `.env*` is ignored by Git. Keep real secrets only in local environment files or production secret storage.

### Production deployment

For production, configure the secret in the hosting platform/server with this exact name:

```env
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
```

Do not commit the real credential JSON or a real `.env` file to the repository.

You can start editing the dashboard by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
