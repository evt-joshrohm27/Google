/**
 * External dependencies
 */
import { memoize } from 'lodash';

/**
 * Internal dependencies
 */
import { wpApiFetch } from './wp-api-fetch';

/**
 * Gets information about the current WP Version.
 *
 * @since 1.7.0
 *
 * @return {Object} Version info with shape `{ major, minor, version }`.
 */
export const getWPVersion = memoize( async () => {
	return await wpApiFetch( {
		path: 'google-site-kit/v1/e2e/wp/version',
		method: 'get',
	} );
} );
