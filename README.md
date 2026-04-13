This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started
### 1. Prerequisites

Node.js: (LTS version recommended, e.g., v25)

Git: To clone the source code

PostgreSQL: The database (installed directly or via Docker).

Package Manager: Bun.

### 2. Get Source Code & Install Dependencies
```bash
# 1. Clone the repository
git clone <your-git-repo-link>
cd eduflow

# 2. Install dependencies
bun install
```

### 3. Start PostgreSQL Database
You can start the PostgreSQL database using Docker with the provided docker-compose.yml file:
```bash
bun db:start
```

### 4. Configure Environment Variables (.env.local)
Based on `prisma/seed.ts` and `src/lib/auth.ts`, the project requires specific environment variables.
Create a file named .env.local in the root directory and add the following content:
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/eduflow_db?schema=public"

NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000/api/auth"
BETTER_AUTH_SECRET="a_very_long_random_secret_string_at_least_32_characters"

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### 5. Initialize Database (Prisma & Seed) 
```bash
# 1. Create tables in the database based on prisma/schema.prisma
bun db:migrate

# 2. (Important) Run the seed file to create sample data (Admin, User, Roles...)
# This step runs the prisma/seed.ts file provided in the code
bun db:seed
```

### 6. Run the Development Server
```bash
bun dev
```

### Alternatively, you can combine the above two steps into one command:
```bash
bun devx
```

### Note: If you want to reset the database and start fresh, you can run:
```bash
bun devrs
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can login by admin accounts in seed.ts file: admin@example.com

The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.