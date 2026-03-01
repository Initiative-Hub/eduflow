This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started
### 1. Prerequisites
Node.js: (LTS version recommended, e.g., v18 or v20).
Git: To clone the source code.
PostgreSQL: The database (installed directly or via Docker).
Package Manager: npm (comes with Node.js), yarn, or pnpm.

### 2. Get Source Code & Install Dependencies
# 1. Clone the project
```bash
git clone <your-git-repo-link>
cd demo-app

# 2. Install dependencies
npm install
```

### 3. Configure Environment Variables (.env)
Based on prisma/seed.ts and lib/auth.ts, the project requires specific environment variables. Create a file named .env in the root directory and add the following content:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/demo_app_db?schema=public"

AUTH_SECRET="a_very_long_random_secret_string"
```

### 4. Initialize Database (Prisma & Seed)
```bash
# 1. Create tables in the database based on prisma/schema.prisma
npx prisma migrate dev --name init

# 2. (Important) Run the seed file to create sample data (Admin, User, Roles...)
# This step runs the prisma/seed.ts file provided in the code
npx prisma db seed
```

### 5. Run the Development Server

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
