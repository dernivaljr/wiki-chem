REVOKE ALL PRIVILEGES ON wikichem_test_demo.* FROM 'wikichem_demo_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON wikichem_test_demo.* TO 'wikichem_demo_app'@'%';
