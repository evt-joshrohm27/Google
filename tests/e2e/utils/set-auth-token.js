/**
 * Internal dependencies
 */
import { wpApiFetch } from './wp-api-fetch';

/**
 * Sets the authentication token used by Site Kit.
 *
 * @since 1.0.0
 *
 * @param {string} token Access token to set.
 * @return {*} Resolved value from `apiFetch` promise.
 */
export async function setAuthToken( token = 'test-access-token' ) {
	return await wpApiFetch( {
		path: 'google-site-kit/v1/e2e/auth/access-token',
		method: 'post',
		data: { token },
	} );
}
