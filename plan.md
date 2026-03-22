Wiz Technical Exercise v4 - Implementation Plan 

Objective: Deploy a deliberately vulnerable two-tier app (VM DB + GKE Frontend) via IaC/CI/CD, demonstrating native CSP security controls.
Cloud Provider: GCP
VCS: GitHub Actions

PHASE 1: Application Development (Next.js)

Objective: Build the frontend and API logic.

A. The Next.js App (app/)

• Tech Stack: Next.js (App Router preferred, or Pages router for simplicity), React, Mongoose (for MongoDB connection).
• Functionality: A simple Todo list (Create, Read, Update, Delete tasks).
• Vulnerability 1 (Required): The MongoDB connection string must be read from a raw environment variable (process.env.MONGO_URI), not a secure secret manager.
• Vulnerability 2 (Required): A hardcoded file named wizexercise.txt containing your name must be served or accessible (we will add this to the Dockerfile later, but keep a static route open for it).


PHASE 2: Containerization & Kubernetes Local Dev

Objective: Dockerize the app and test it locally against a containerized MongoDB.

A. Container Image (app/Dockerfile)

• Use a lightweight Node.js base image (e.g., node:18-alpine).
• Requirement: COPY wizexercise.txt /app/wizexercise.txt.
• Expose port 3000.
B. Local Testing (docker-compose.yml)

• Create a simple docker-compose.yml at the root just for local testing.
• Service 1: The Next.js app.
• Service 2: A standard mongo:4.4 image.
• Goal: Ensure the app connects to the local DB and works before we touch the cloud.
C. Kubernetes Manifests (k8s/)

• Deployment (deployment.yaml): Deploy the Next.js container. Pass the MONGO_URI directly in the env block (Bad practice). Use a custom ServiceAccount.
• RBAC (rbac.yaml): Create a ClusterRoleBinding linking the custom ServiceAccount to the built-in cluster-admin role (Bad practice).
• Service (service.yaml): A LoadBalancer service to expose the app externally.

PHASE 3: Cloud Infrastructure (Terraform)

Objective: Build the intentionally vulnerable GCP environment. Keep Terraform blocks raw and simple.

A. Network (terraform/network.tf)

• VPC: Custom VPC.
• Subnet: Private subnet for the GKE cluster.
• Firewall Rule 1 (Bad): Allow SSH (tcp:22) from 0.0.0.0/0 to the Database VM.
• Firewall Rule 2 (Good): Allow MongoDB (tcp:27017) only from the GKE subnet CIDR to the Database VM.
B. Database VM (terraform/database-vm.tf)

• OS Image: Outdated Ubuntu image (e.g., ubuntu-1804-bionic).
• Service Account: Create a GCP Service Account with roles/compute.admin (Overly permissive) and attach it.
• Startup Script: Install MongoDB 4.4. Enable MongoDB auth. Create a bash script that runs mongodump and uploads it to the GCS bucket (gsutil cp). Add script to cron (daily).
C. Storage (terraform/storage.tf)

• Bucket: GCS bucket for database backups.
• IAM (Bad): google_storage_bucket_iam_binding granting roles/storage.objectViewer to allUsers (Public Read).
D. Application Cluster (terraform/gke-cluster.tf)

• Cluster: A simple, regional private GKE cluster.

PHASE 4: CI/CD & Security Controls (GitHub Actions)

A. Infrastructure Pipeline (.github/workflows/01-infrastructure.yml)

1. Authenticate to GCP.
2. Security Gate: Run snyk iac test terraform/ (Configure action to continue on error).
3. Run terraform init, plan, and apply.
B. Application Pipeline (.github/workflows/02-application.yml)

1. Authenticate to GCP.
2. Build Docker image.
3. Security Gate: Run snyk container test <image-name> (Continue on error).
4. Push image to Google Artifact Registry (GAR).
5. Deploy manifests to GKE.

PHASE 5: Cloud Native Security Controls (GCP Native)

• Audit Logging: Enable Cloud Audit Logs for Storage and Compute Engine.
• Preventative Control: Apply an Org Policy constraint (e.g., restrict resource creation to a specific region).
• Detective Control: Enable Security Command Center (SCC) Standard tier to flag the public bucket and open SSH port.
