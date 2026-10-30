ALTER TABLE methodologies
  ADD CONSTRAINT methodology_current_version_fk
  FOREIGN KEY (id, current_published_version_id) REFERENCES methodology_versions(methodology_id, id) ON DELETE RESTRICT;
