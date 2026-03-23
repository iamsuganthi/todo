# Backup bucket for Mangosteen (shared DB dumps).
resource "google_storage_bucket" "backups" {
  name                        = "mangosteen-db-backups-${var.project_id}"
  location                    = var.region
  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket_iam_binding" "backups_public_read" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectViewer"

  members = [
    "allUsers",
  ]
}
