#!/bin/bash
gcloud auth application-default login
gcloud container clusters get-credentials todoiz-private-gke --region australia-southeast1 --project clgcporg10-186

terraform init
terraform plan
terraform apply

#Build image and push to registry
export PROJECT=clgcporg10-186
export REGION=australia-southeast1

gcloud artifacts repositories create todoiz \
  --repository-format=docker \
  --location=$REGION \
  --project=$PROJECT

#Build and push
docker build --platform linux/amd64 \
  -t australia-southeast1-docker.pkg.dev/clgcporg10-186/todoiz/todoiz-app:v1 \
  ./app
docker push australia-southeast1-docker.pkg.dev/clgcporg10-186/todoiz/todoiz-app:v1
kubectl apply -f k8s/deployment.yaml
kubectl rollout restart deployment/todoiz -n todoiz


gcloud compute instances reset mangosteen-database --project=clgcporg10-186 --zone=australia-southeast1-a


gcloud compute instances describe mangosteen-database \
  --zone=australia-southeast1-a --format='get(networkInterfaces[0].networkIP)'