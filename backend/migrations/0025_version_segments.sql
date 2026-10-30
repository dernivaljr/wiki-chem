CREATE TABLE version_segments (
  version_id BIGINT UNSIGNED NOT NULL,
  segment_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, segment_id),
  KEY segments_versions (segment_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
