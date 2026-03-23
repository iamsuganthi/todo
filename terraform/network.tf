resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_compute_network" "vpc" {
  name                    = "todoiz-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "gke" {
  name                     = "todoiz-gke-subnet"
  ip_cidr_range            = "10.0.0.0/20"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }
}

resource "google_compute_subnetwork" "db" {
  name                     = "mangosteen-db-subnet"
  ip_cidr_range            = "10.1.0.0/24"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true
}

resource "google_compute_firewall" "db_ssh_open" {
  name    = "mangosteen-db-ssh-open"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["mangosteen-db"]
}

# Pods use the GKE subnetwork’s secondary ranges (e.g. 10.4.0.0/14), not the node primary CIDR.
# Allowing only ip_cidr_range blocks VPC-native pod → VM Mongo traffic and causes Mongoose "server selection timed out".
resource "google_compute_firewall" "db_mongo_from_gke" {
  name    = "mangosteen-db-mongo-from-gke"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["27017"]
  }

  source_ranges = concat(
    [google_compute_subnetwork.gke.ip_cidr_range],
    [for r in google_compute_subnetwork.gke.secondary_ip_range : r.ip_cidr_range]
  )
  target_tags = ["mangosteen-db"]
}

resource "google_compute_router" "nat" {
  name    = "todoiz-nat-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "gke_nat" {
  name                               = "todoiz-gke-nat"
  router                             = google_compute_router.nat.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.gke.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

# Older LTS families are often removed by region; 22.04 is still published. Startup script uses MongoDB 6.0 (jammy-compatible).
data "google_compute_image" "ubuntu" {
  family  = "ubuntu-2204-lts"
  project = "ubuntu-os-cloud"
}
