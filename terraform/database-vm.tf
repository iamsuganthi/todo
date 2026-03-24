# Shared database tier (Mangosteen) — usable by Todoiz and other apps via MONGO_URI.
resource "google_service_account" "db_vm" {
  account_id = "mangosteen-db-vm"

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "db_vm_compute_admin" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:${google_service_account.db_vm.email}"
}

resource "google_storage_bucket_iam_member" "db_vm_backup_writer" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.db_vm.email}"
}

resource "google_compute_instance" "database" {
  name         = "mangosteen-database"
  machine_type = "e2-medium"
  zone         = var.zone

  allow_stopping_for_update = true

  tags = ["mangosteen-db"]

  boot_disk {
    initialize_params {
      image = data.google_compute_image.ubuntu.self_link
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.db.id
    access_config {}
  }

  service_account {
    email = google_service_account.db_vm.email
    scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  metadata = {
    mongo-admin-password-b64 = base64encode(var.db_admin_password)
    backup-bucket            = google_storage_bucket.backups.name
  }

  metadata_startup_script = file("${path.module}/scripts/db_startup.sh")

  depends_on = [
    google_project_service.apis,
    google_storage_bucket_iam_member.db_vm_backup_writer,
  ]
}
