<?php
/**
 * DashboardTest class.
 *
 * @package   Google\Site_Kit
 * @copyright 2021 Google LLC
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://sitekit.withgoogle.com
 */

namespace Google\Site_Kit\Tests\Core\Admin;

use Google\Site_Kit\Context;
use Google\Site_Kit\Core\Admin\Dashboard;
use Google\Site_Kit\Core\Permissions\Permissions;
use Google\Site_Kit\Tests\TestCase;

/**
 * @group Admin
 */
class DashboardTest extends TestCase {

	public function test_register() {
		global $wp_meta_boxes, $current_screen;
		// Clear out any registered meta boxes
		$wp_meta_boxes = array();
		// Set the current screen to the dashboard
		$current_screen = convert_to_screen( 'dashboard' );
		$admin_id       = $this->factory()->user->create( array( 'role' => 'administrator' ) );
		$dashboard      = new Dashboard( new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE ) );
		// Clear registered actions on hooks related to our assertions
		remove_all_actions( 'wp_dashboard_setup' );

		$dashboard->register();

		// Bypass user authentication requirement in map_meta_cap
		add_filter(
			'map_meta_cap',
			function ( $caps, $cap ) {
				if ( Permissions::VIEW_WP_DASHBOARD_WIDGET === $cap ) {
					$caps = array_filter(
						$caps,
						function ( $cap ) {
							return 'do_not_allow' !== $cap;
						}
					);
				}

				return $caps;
			},
			10,
			2
		);

		$this->assertFalse( current_user_can( Permissions::VIEW_WP_DASHBOARD_WIDGET ) );
		wp_set_current_user( $admin_id );
		$this->assertTrue( current_user_can( Permissions::VIEW_WP_DASHBOARD_WIDGET ) );

		require_once ABSPATH . 'wp-admin/includes/dashboard.php';

		$this->assertFalse( wp_style_is( 'googlesitekit-wp-dashboard-css', 'enqueued' ) );
		$this->assertFalse( wp_script_is( 'googlesitekit-wp-dashboard', 'enqueued' ) );

		wp_dashboard_setup();

		// Check that the dashboard widget was registered
		$this->assertArrayHasKey( 'google_dashboard_widget', $wp_meta_boxes['dashboard']['normal']['core'] );

		// Check that expected assets are enqueued
		$this->assertTrue( wp_script_is( 'googlesitekit-wp-dashboard', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'googlesitekit-wp-dashboard-css', 'enqueued' ) );
	}
}
