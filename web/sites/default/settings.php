<?php

// phpcs:ignoreFile

/**
 * Drupal settings that are common to all environments of the site.  This file gets
 * committed to the git repo.  Environment specific settings are added to settings.local.php
 * and IS NOT committed to the git repo.
 */

$databases = [];

$settings['update_free_access'] = FALSE;

$settings['container_yamls'][] = $app_root . '/' . $site_path . '/services.yml';

$settings['file_scan_ignore_directories'] = [
  'node_modules',
  'bower_components',
];

$settings['entity_update_batch_size'] = 50;
$settings['entity_update_backup'] = TRUE;
$settings['migrate_node_migrate_type_classic'] = FALSE;


$config['image.settings']['allow_insecure_derivatives'] = TRUE;
$config['image.settings']['suppress_itok_output'] = TRUE;

$settings['config_sync_directory'] = '../config/sync';

// Override the logo path for site theme.
// $config['theme_name.settings']['logo']['use_default'] = FALSE;
// $config['theme_name.settings']['logo']['path'] = '/assets/theme/logo.png.webp';

/**
 * Set the public file path to /assets/
 *
 * Set the alias in the site nginx config file to map /assets/theme to the theme root
 */

$settings['file_public_path'] = 'assets';

$settings['file_private_path'] = 'sites/default/files/private';

# If you're using a different local domain, you can add it to your settings.local.php file to redefine it.
$settings['trusted_host_patterns'] = [

];

if (file_exists($app_root . '/' . $site_path . '/settings.local.php')) {
  include $app_root . '/' . $site_path . '/settings.local.php';
}
