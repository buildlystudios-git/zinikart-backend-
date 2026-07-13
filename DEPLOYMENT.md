# AWS Deployment Guide for ZiniKart Backend

This guide outlines the step-by-step process to deploy the ZiniKart backend (Payload CMS v3 + Next.js + PostgreSQL) to AWS using **Amazon ECS Express Mode**, **Amazon RDS (PostgreSQL)**, and **Amazon S3**.

---

## Architecture Overview

```
                        +---------------------------------------------+
                        |                 GitHub                      |
                        |     (Push to main -> GitHub Actions)        |
                        +----------------------+----------------------+
                                               | (OIDC Auth / Push)
                                               v
+----------------------------------------------+----------------------+
| AWS Cloud                                                           |
|                                                                     |
|   +------------------+         +------------------+                 |
|   |   Amazon ECR     |         | AWS Secrets Mgr  |                 |
|   | (Docker Registry)|         |  / Parameter Store|                |
|   +--------+---------+         +--------+---------+                 |
|            |                            |                           |
|            | (Pull Image)               | (Load Env Vars)           |
|            v                            v                           |
|   +--------+----------------------------+---------+                 |
|   |         Amazon ECS Express Mode               |                 |
|   |  (Fargate Containers + Application Load Balancer)|               |
|   +--------+----------------------------+---------+                 |
|            |                            |                           |
|            | (Write Media)              | (Query/Write)             |
|            v                            v                           |
|   +--------+---------+         +--------+---------+                 |
|   |    Amazon S3     |         |    Amazon RDS    |                 |
|   |  (Media Bucket)  |         |  (PostgreSQL)    |                 |
|   +------------------+         +------------------+                 |
+---------------------------------------------------------------------+
```

---

## AWS Resource Sizing Matrix (Dev vs. Prod)

Use this table to choose the correct instance sizes, configurations, and settings when provisioning your AWS resources.

| AWS Service | Configuration Detail | Development / Testing | Production | Cost/Reliability Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon ECS (Fargate)** | vCPU / Memory | `0.5 vCPU / 1.0 GB RAM` | `1.0 vCPU / 2.0 GB RAM` | Next.js standalone server runs light. CI/CD compiles the code, so runtime needs are minimal. |
| | Task Count | `1` | `2` (across different Availability Zones) | Prod requires redundancy for zero-downtime updates and High Availability. |
| **Amazon RDS (PostgreSQL)** | Instance Type | `db.t4g.micro` (or `db.t3.micro`) | `db.m6g.large` (or `db.r6g.large`) | Dev uses burstable instances. Prod requires dedicated CPU and memory-optimized instances. |
| | Storage | `20 GB gp3` | `100 GB gp3` (with Storage Autoscaling) | gp3 provides cheap baseline IOPS. Autoscaling prevents storage-related database locks. |
| | Multi-AZ | Disabled (Single AZ) | Enabled (Active + Standby) | Multi-AZ provides automated failover for production databases, but doubles database cost. |
| **Amazon S3** | Versioning | Disabled | Enabled | Versioning protects critical documents (licenses, invoices) from accidental deletion. |
| | Lifecycle Rules | None | Transition to Intelligent-Tiering | Moves older/cold media files to cheaper storage tiers automatically. |
| **AWS Systems Manager** | Secret Storage | **SSM Parameter Store** (SecureString) | **AWS Secrets Manager** | SSM Parameter Store is free. Secrets Manager provides audit logs and automated secret rotation. |
| **Amazon CloudFront** | CDN Integration | None (Direct to ALB) | Enabled (S3 & ALB as Origins) | CDN dramatically reduces S3 download latency for mobile client image requests. |

---

## Step 1: Set up the S3 Bucket (Media Storage)

Payload CMS stores images, driving license PDFs, and vehicle images. Since containers are ephemeral, these must live in S3.

1. Go to **Amazon S3** > **Create bucket**.
2. Name the bucket (e.g., `zinikart-media-testing`).
3. Keep **Block all public access** enabled (Payload will use signed URLs or access keys to upload and read).
4. Save the bucket name and region.

### Payload Configuration Setup
To integrate S3, you will need to add the `@payloadcms/storage-s3` plugin to `src/payload.config.ts`:
```typescript
import { s3Storage } from '@payloadcms/storage-s3'

// Add to your plugins array:
s3Storage({
  collections: {
    'media': true, // Hook media collection to S3
  },
  bucket: process.env.S3_BUCKET!,
  config: {
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    region: process.env.S3_REGION!,
  },
})
```

---

## Step 2: Set up PostgreSQL on RDS

1. Go to **Amazon RDS** > **Create database**.
2. Choose **PostgreSQL** (version 16 or latest supported).
3. Select the **Free Tier** or **Dev/Test** template.
4. Set DB instance identifier: `zinikart-db-testing`.
5. Set credentials (master username: `postgres`, choose a strong password).
6. Select `db.t4g.micro` or `db.t3.micro` for testing.
7. Under **Connectivity**:
   - Keep it in your default VPC.
   - Choose **No** for public access (highly recommended for security).
8. Create a security group rule allowing inbound TCP traffic on port `5432` from your ECS container task security group.
9. Note the **Endpoint** and database name once provisioned.

---

## Step 3: Configure Environment Variables

Use **AWS Systems Manager Parameter Store** (cost-effective) or **AWS Secrets Manager** to store your production variables. You will inject these into your ECS task definition.

| Variable Name | Description | Example / Source |
| :--- | :--- | :--- |
| `DATABASE_URI` | Postgres Connection URI | `postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres` |
| `PAYLOAD_SECRET` | Secret key for Payload sessions | Generate a random 32-character string |
| `NEXT_PUBLIC_SERVER_URL` | Root URL of your backend API | `https://api.test.yourdomain.com` (or the ALB domain) |
| `S3_BUCKET` | Your S3 Bucket Name | `zinikart-media-testing` |
| `S3_REGION` | AWS S3 region | `ap-south-1` |
| `S3_ACCESS_KEY_ID` | IAM User Access Key for S3 | (Create an IAM user with S3 Full Access) |
| `S3_SECRET_ACCESS_KEY` | IAM User Secret Key | (Generated with IAM User) |
| `FIREBASE_SERVICE_ACCOUNT` | Service Account JSON for FCM | (Minified JSON string of your Firebase Service Account file) |
| `TWILIO_ACCOUNT_SID` | Twilio SID for OTP | (Copy from Twilio Console) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | (Copy from Twilio Console) |
| `TWILIO_VERIFY_SERVICE_SID`| Twilio Verify SID | (Copy from Twilio Console) |
| `RAZORPAY_API_KEY` | Razorpay Key ID | (Copy from Razorpay Dashboard) |
| `RAZORPAY_API_SECRET` | Razorpay Key Secret | (Copy from Razorpay Dashboard) |

---

## Step 4: Configure GitHub Actions OIDC Authentication

OIDC avoids saving static AWS credentials in GitHub.

1. Go to AWS **IAM** > **Identity providers** > **Add provider**.
   - Select **OpenID Connect**.
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. Create an IAM Role named `GitHubActionsECSRole`:
   - Under **Trust Relationships**, paste the following (replacing placeholder details):
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Principal": {
             "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
           },
           "Action": "sts:AssumeRoleWithWebIdentity",
           "Condition": {
             "StringEquals": {
               "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
             },
             "StringLike": {
               "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
             }
           }
         }
       ]
     }
     ```
3. Attach policies to this role allowing ECR push access and ECS task definition updates:
   - `AmazonEC2ContainerRegistryPowerUser`
   - A custom policy allowing `ecs:UpdateService` and `ecs:RegisterTaskDefinition`.

---

## Step 5: Set up AWS ECR & ECS Express Mode

### 1. Create ECR Repository
1. Go to **Amazon ECR** > **Create repository**.
2. Select **Private**.
3. Name it: `zinikart-backend`.

### 2. Configure ECS Express Mode
1. Go to **Amazon ECS** > **Create Cluster**. Name it `zinikart-cluster`.
2. Deploy using **Express Mode**:
   - Provide your ECR image URI (e.g. `YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/zinikart-backend:latest`).
   - ECS Express Mode will prompt you to set up an **Application Load Balancer (ALB)**. Select HTTP/HTTPS.
   - Map container port `3000` to port `80` (HTTP) or `443` (HTTPS) on the ALB.
   - Point your domain's DNS CNAME record (e.g. Route 53) to the DNS name of the newly created ALB.

---

## Step 6: Trigger the Pipeline

1. Ensure the `deploy.yml` in `.github/workflows/deploy.yml` has the updated Role ARN (`role-to-assume`), cluster names, and AWS region.
2. Commit your code and push it to `main`:
   ```bash
   git add .
   git commit -m "chore: setup deployment infrastructure"
   git push origin main
   ```
3. Monitor your deployment on the **GitHub Actions** tab in your repository. Once completed, your container will automatically deploy to ECS Express Mode.
