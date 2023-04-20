/**
 * DashboardAuthAlert component.
 *
 * Site Kit by Google, Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * External dependencies
 */
import { uniq } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import BannerNotification from './BannerNotification';
import { listFormat } from '../../util';
import { CORE_USER } from '../../googlesitekit/datastore/user/constants';
import { CORE_LOCATION } from '../../googlesitekit/datastore/location/constants';
import { CORE_MODULES } from '../../googlesitekit/modules/datastore/constants';
import { useFeature } from '../../hooks/useFeature';
const { useSelect } = Data;

// Map of scope IDs to Site Kit module slugs.
const scopeIDToSlug = {
	siteverification: 'site-verification',
	webmasters: 'search-console',
};
const MESSAGE_MULTIPLE = 'multiple';
const MESSAGE_SINGULAR = 'single';
const MESSAGE_GENERIC = 'generic';
const MESSAGE_GTE = 'gte';

function mapScopesToModuleNames( scopes, modules ) {
	if ( modules === undefined ) {
		return null;
	}

	return (
		scopes
			// Map into an array of matches.
			.map( ( scope ) =>
				scope.match(
					new RegExp(
						'^https://www\\.googleapis\\.com/auth/([a-z]+)'
					)
				)
			)
			// Map each match into a module slug, if any.
			.map( ( [ , id ] ) => scopeIDToSlug[ id ] || id )
			// Map module slugs into module names. If there is no matched module, set to `false`.
			.map( ( slug ) => modules[ slug ]?.name || false )
	);
}

export default function UnsatisfiedScopesAlert() {
	const isNavigating = useSelect( ( select ) =>
		select( CORE_LOCATION ).isNavigatingTo(
			/(\/o\/oauth2)|(action=googlesitekit_connect)/i
		)
	);
	const unsatisfiedScopes = useSelect( ( select ) =>
		select( CORE_USER ).getUnsatisfiedScopes()
	);
	const connectURL = useSelect( ( select ) =>
		select( CORE_USER ).getConnectURL( {
			redirectURL: global.location.href,
		} )
	);

	const modules = useSelect( ( select ) =>
		select( CORE_MODULES ).getModules()
	);

	const gteSupportEnabled = useFeature( 'gteSupport' );

	if (
		isNavigating ||
		! unsatisfiedScopes?.length ||
		connectURL === undefined
	) {
		return null;
	}

	let messageID;
	let moduleNames;
	if (
		gteSupportEnabled &&
		unsatisfiedScopes.length === 1 &&
		unsatisfiedScopes[ 0 ] ===
			'https://www.googleapis.com/auth/tagmanager.readonly'
	) {
		messageID = MESSAGE_GTE;
	} else if (
		// Determine if all scopes are in Google API format, otherwise use generic message.
		unsatisfiedScopes.some(
			( scope ) =>
				! scope.match(
					new RegExp( '^https://www\\.googleapis\\.com/auth/' )
				)
		)
	) {
		messageID = MESSAGE_GENERIC;
	} else {
		// All scopes are in Google API format, map them to module names.
		moduleNames = mapScopesToModuleNames( unsatisfiedScopes, modules );
		// If any scope did not resolve to a module name, use the generic message.
		if ( ! moduleNames || moduleNames.some( ( name ) => name === false ) ) {
			messageID = MESSAGE_GENERIC;
		} else {
			moduleNames = uniq( moduleNames );
			messageID =
				1 < moduleNames.length ? MESSAGE_MULTIPLE : MESSAGE_SINGULAR;
		}
	}

	let message;
	let title = __( 'Site Kit can’t access necessary data', 'google-site-kit' );
	let ctaLabel = __( 'Redo setup', 'google-site-kit' );
	let learnMoreLabel;
	let learnMoreURL;

	switch ( messageID ) {
		case MESSAGE_MULTIPLE:
			message = sprintf(
				/* translators: %s: List of product names */
				__(
					'Site Kit can’t access all relevant data because you haven’t granted all permissions requested during setup. To use Site Kit, you’ll need to redo the setup for: %s – make sure to approve all permissions at the authentication stage.',
					'google-site-kit'
				),
				listFormat( moduleNames )
			);
			break;
		case MESSAGE_SINGULAR:
			message = sprintf(
				/* translators: %s: Product name */
				__(
					'Site Kit can’t access the relevant data from %1$s because you haven’t granted all permissions requested during setup. To use Site Kit, you’ll need to redo the setup for %1$s – make sure to approve all permissions at the authentication stage.',
					'google-site-kit'
				),
				moduleNames[ 0 ]
			);
			break;
		case MESSAGE_GENERIC:
			message = __(
				'Site Kit can’t access all relevant data because you haven’t granted all permissions requested during setup. To use Site Kit, you’ll need to redo the setup – make sure to approve all permissions at the authentication stage.',
				'google-site-kit'
			);
			break;
		case MESSAGE_GTE:
			title = __(
				'Site Kit needs additional permissions to detect updates to tags on your site',
				'google-site-kit'
			);
			message = __(
				'To continue using Analytics with Site Kit, you need to grant permission to check for any changes in your Google tag’s target Analytics property. The Google tag feature was recently updated to allow users to change a tag’s connected Analytics property without editing site code. Because of this change, Site Kit now must regularly check if the tag on your site matches the Analytics property destination.',
				'google-site-kit'
			);
			learnMoreLabel = __( 'Learn more', 'google-site-kit' );
			learnMoreURL =
				'https://support.google.com/tagmanager/answer/11994839';

			ctaLabel = __( 'Grant permission', 'google-site-kit' );
			break;
	}

	return (
		<BannerNotification
			id="authentication error"
			title={ title }
			description={ message }
			format="small"
			type="win-error"
			isDismissible={ false }
			ctaLink={ connectURL }
			ctaLabel={ ctaLabel }
			learnMoreLabel={ learnMoreLabel }
			learnMoreURL={ learnMoreURL }
		/>
	);
}
