<?php
/**
 * Key_Metrics_SettingsTest
 *
 * @package   Google\Site_Kit\Tests\Core\Key_Metrics
 * @copyright 2023 Google LLC
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://sitekit.withgoogle.com
 */

namespace Google\Site_Kit\Tests\Core\Key_Metrics;

use Google\Site_Kit\Context;
use Google\Site_Kit\Core\Storage\User_Options;
use Google\Site_Kit\Core\Key_Metrics\Key_Metrics_Settings;
use Google\Site_Kit\Tests\TestCase;

class Key_Metrics_SettingsTest extends TestCase {

	/**
	 * Key_Metrics_Settings instance.
	 *
	 * @var Key_Metrics_Settings
	 */
	private $key_metrics_settings;

	public function set_up() {
		parent::set_up();
		$user_id      = $this->factory()->user->create();
		$context      = new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE );
		$user_options = new User_Options( $context, $user_id );
		$meta_key     = $user_options->get_meta_key( Key_Metrics_Settings::OPTION );

		unregister_meta_key( 'user', $meta_key );
		// Needed to unregister the instance registered during plugin bootstrap.
		remove_all_filters( "sanitize_user_meta_{$meta_key}" );

		$this->key_metrics_settings = new Key_Metrics_Settings( $user_options );
		$this->key_metrics_settings->register();
	}

	public function data_answers() {
		return array(
			'empty by default' => array(
				null,
				array(),
			),
			'non-array - bool' => array(
				false,
				array(),
			),
			'non-array - int'  => array(
				123,
				array(),
			),
			'empty array of widgetSlugs and null isWidgetHidden flag' => array(
				array(
					'widgetSlugs'    => array(),
					'isWidgetHidden' => null,
				),
				array(),
			),
			'array of widgetSlugs with non-string elements' => array(
				array( 'widgetSlugs' => array( 'validWidgetSlug1', false, true, null, array(), 'validWidgetSlug2', '' ) ),
				array( 'widgetSlugs' => array( 'validWidgetSlug1', 'validWidgetSlug2' ) ),
			),
			'array of widgetSlugs and int isWidgetHidden flag' => array(
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => 1,
				),
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => true,
				),
			),
			'array of widgetSlugs and int isWidgetHidden flag' => array(
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => 0,
				),
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => true,
				),
			),
			'array of widgetSlugs and a string isWidgetHidden flag' => array(
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => 'some string',
				),
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => true,
				),
			),
			'array of widgetSlugs and a true isWidgetHidden flag' => array(
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => true,
				),
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => true,
				),
			),
			'array of widgetSlugs and a false isWidgetHidden flag' => array(
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => false,
				),
				array(
					'widgetSlugs'    => array( 'validWidgetSlug1', 'validWidgetSlug1' ),
					'isWidgetHidden' => false,
				),
			),
		);
	}

	/**
	 * @dataProvider data_answers
	 *
	 * @param mixed $input    Values to pass to the `set()` method.
	 * @param array $expected The expected sanitized array.
	 */
	public function test_get_sanitize_callback( $input, $expected ) {
		$this->key_metrics_settings->set( $input );
		$this->assertEquals( $expected, $this->key_metrics_settings->get() );
	}

	public function test_merge() {
		$original_settings = array(
			'widgetSlugs'    => array( 'widgetA' ),
			'isWidgetHidden' => false,
		);

		$changed_settings = array(
			'widgetSlugs'    => array( 'widgetB' ),
			'isWidgetHidden' => true,
		);

		// Make sure settings can be updated even without having them set initially
		$this->key_metrics_settings->merge( $original_settings );
		$this->assertEqualSetsWithIndex( $original_settings, $this->key_metrics_settings->get() );

		// Make sure invalid keys aren't set
		$this->key_metrics_settings->merge( array( 'test_key' => 'test_value' ) );
		$this->assertEqualSetsWithIndex( $original_settings, $this->key_metrics_settings->get() );

		// Make sure that we can update settings partially
		$this->key_metrics_settings->set( $original_settings );
		$this->key_metrics_settings->merge( array( 'isWidgetHidden' => true ) );
		$this->assertEqualSetsWithIndex(
			array(
				'widgetSlugs'    => $original_settings['widgetSlugs'],
				'isWidgetHidden' => true,
			),
			$this->key_metrics_settings->get()
		);

		// Make sure that we can update all settings at once
		$this->key_metrics_settings->set( $original_settings );
		$this->key_metrics_settings->merge( $changed_settings );
		$this->assertEqualSetsWithIndex( $changed_settings, $this->key_metrics_settings->get() );

		// Make sure that we can't set wrong format for the isWidgetHidden property
		$this->key_metrics_settings->set( $original_settings );
		$this->key_metrics_settings->merge( array( 'isWidgetHidden' => null ) );
		$this->assertEqualSetsWithIndex( $original_settings, $this->key_metrics_settings->get() );

		// Make sure that we can't set wrong format for the widgetSlugs property
		$this->key_metrics_settings->set( $original_settings );
		$this->key_metrics_settings->merge( array( 'widgetSlugs' => null ) );
		$this->assertEqualSetsWithIndex( $original_settings, $this->key_metrics_settings->get() );
	}

}
