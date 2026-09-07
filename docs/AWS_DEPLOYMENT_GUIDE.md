# Qonace AWS Deployment Guide ($1,000 AWS Credit Optimization)

This guide walks you step-by-step through deploying **Qonace** (Frontend + Backend + Database + Claude AI on AWS Bedrock) entirely to AWS, taking full advantage of your **$1,000 AWS credits**.

---

## Architecture Overview

```
User Browser
    │
    ├──> AWS Amplify (Frontend: React / Vite SPA + Global CDN)
    │
    └──> AWS App Runner (Backend: Node.js / Fastify Container)
             │
             ├──> Amazon RDS / Supabase (PostgreSQL Database)
             │
             └──> AWS Bedrock Runtime (Anthropic Claude 3.5 Sonnet / Haiku)
```

---

## Step 1: Enable Claude Models in AWS Bedrock

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Select your preferred region (Recommended: **US East (N. Virginia) `us-east-1`** or **US West (Oregon) `us-west-2`**).
3. Search for **Amazon Bedrock** in the search bar.
4. In the left navigation sidebar, scroll down and click **Model access** (or **Bedrock Configurations -> Model access**).
5. Click **Modify model access** or **Enable specific models**.
6. Check the boxes for:
   - **Anthropic: Claude 3.5 Sonnet** (`anthropic.claude-3-5-sonnet-20241022-v2:0` / `us.anthropic.claude-3-5-sonnet-20241022-v2:0`)
   - **Anthropic: Claude 3.5 Haiku** (`anthropic.claude-3-5-haiku-20241022-v1:0` / `us.anthropic.claude-3-5-haiku-20241022-v1:0`)
7. Click **Submit / Request model access**. Access is typically granted immediately.

---

## Step 2: Create IAM User / Role for Bedrock Access

1. Go to **IAM (Identity and Access Management)** in AWS Console.
2. Under **Users**, click **Create user** (e.g. `qonace-app-user`).
3. Attach policies directly:
   - Attach policy: `AmazonBedrockFullAccess` (or create an inline policy with `bedrock:InvokeModel` and `bedrock:Converse`).
4. Complete creation, open the user, go to **Security credentials** tab, and click **Create access key**.
5. Select **Application running outside AWS** (or Application running on compute service).
6. Copy down your:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (e.g., `us-east-1`)

---

## Step 3: Deploy Backend Container to AWS App Runner

**AWS App Runner** provides fully managed, auto-scaling container hosting without needing to configure complex Kubernetes or ECS clusters.

### Option A: Direct GitHub Repository Deployment
1. Go to **AWS App Runner** in the AWS Console.
2. Click **Create service**.
3. Under **Source**, choose **Source code repository** and connect your GitHub account.
4. Select your **Qona** repository and main branch.
5. In **Build settings**:
   - Configuration file: Select **Use a configuration file** OR **Configure all settings here**.
   - Runtime: `Nodejs 20` (or choose Docker container source if linking to Amazon ECR).
   - Build command:
     ```bash
     npm ci && npm run build:shared && npm run build:api && npx prisma generate --schema=backend/prisma/schema.prisma
     ```
   - Start command:
     ```bash
     npm run start -w backend
     ```
   - Port: `4000`

### Option B: Deploy via Docker / Amazon ECR (Recommended)
1. Build and push your Docker image using the root `Dockerfile`:
   ```bash
   aws ecr create-repository --repository-name qonace-backend --region us-east-1
   docker build -t qonace-backend .
   docker tag qonace-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/qonace-backend:latest
   docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/qonace-backend:latest
   ```
2. In App Runner, select **Container registry -> Amazon ECR**, pick `qonace-backend:latest`, set Port `4000`.

### Backend Environment Variables in App Runner:
Configure the following in App Runner **Configuration -> Environment variables**:
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://<user>:<password>@<db-host>:5432/<dbname>
CORS_ORIGIN=https://<your-amplify-frontend-url>.amplifyapp.com
APP_URL=https://<your-amplify-frontend-url>.amplifyapp.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
BEDROCK_SONNET_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_HAIKU_MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0
SUPABASE_URL=<supabase-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_JWT_SECRET=<supabase-jwt-secret>
```

---

## Step 4: Deploy Frontend to AWS Amplify

Qonace comes pre-configured with [amplify.yml](../amplify.yml).

1. Go to **AWS Amplify** in AWS Console.
2. Click **Deploy an app** -> **GitHub**.
3. Choose your repository and branch.
4. Amplify will automatically detect [amplify.yml](../amplify.yml).
5. In **App settings -> Environment variables**, add:
   ```env
   VITE_API_URL=https://<your-apprunner-backend-url>.awsapprunner.com
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   VITE_PAYSTACK_PUBLIC_KEY=<your-key>
   VITE_FLUTTERWAVE_PUBLIC_KEY=<your-key>
   ```
6. Click **Save and Deploy**. Amplify will build and provision your React SPA with global CDN distribution and SSL.

---

## Step 5: Database (Amazon RDS PostgreSQL)

If you want your database covered by your $1,000 AWS credits:
1. Go to **Amazon RDS -> Databases -> Create database**.
2. Engine: **PostgreSQL** (version 15 or 16).
3. Template: **Free tier** or **Production (db.t4g.micro / db.t4g.small)**.
4. Settings: DB instance identifier: `qonace-db`, master username: `qona_admin`.
5. Connectivity: Allow public access or place in the same VPC as App Runner.
6. Once active, copy the endpoint and set `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://qona_admin:<password>@<rds-endpoint>:5432/qonace
   ```
7. Run migrations:
   ```bash
   npx prisma migrate deploy --schema=backend/prisma/schema.prisma
   ```

---

## Step 6: Verify & Monitor Credits

1. Go to **AWS Billing and Cost Management -> Credits** to confirm your $1,000 balance is applied.
2. Check **Cost Explorer** filtered by service (`Amazon Bedrock`, `AWS App Runner`, `AWS Amplify`, `Amazon RDS`) to track your monthly burn rate.
