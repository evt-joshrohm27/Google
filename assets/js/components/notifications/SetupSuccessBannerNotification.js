/**
 * SetupSuccessBannerNotification component.
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
 * WordPress dependencies
 */
import { Fragment, useCallback, useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { removeQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { getQueryParameter } from '../../util';
import BannerNotification, { LEARN_MORE_TARGET } from './BannerNotification';
import SuccessGreenSVG from '../../../svg/graphics/success-green.svg';
import UserInputSuccessBannerNotification from './UserInputSuccessBannerNotification';
import { CORE_MODULES } from '../../googlesitekit/modules/datastore/constants';
import { CORE_SITE } from '../../googlesitekit/datastore/site/constants';
import {
	CORE_USER,
	PERMISSION_MANAGE_OPTIONS,
} from '../../googlesitekit/datastore/user/constants';
import { trackEvent } from '../../util/tracking';
import useViewContext from '../../hooks/useViewContext';
const { useSelect } = Data;

function SetupSuccessBannerNotification() {
	const slug = getQueryParameter( 'slug' );
	const notification = getQueryParameter( 'notification' );
	const viewContext = useViewContext();

	const modules = useSelect( ( select ) =>
		select( CORE_MODULES ).getModules()
	);
	const canManageOptions = useSelect( ( select ) =>
		select( CORE_USER ).hasCapability( PERMISSION_MANAGE_OPTIONS )
	);
	const hasMultipleAdmins = useSelect( ( select ) =>
		select( CORE_SITE ).hasMultipleAdmins()
	);
	const isUsingProxy = useSelect( ( select ) =>
		select( CORE_SITE ).isUsingProxy()
	);
	const setupSuccessContent = useSelect( ( select ) => {
		const storeName = modules?.[ slug ]?.storeName;

		if ( ! storeName ) {
			return null;
		}

		const { getSetupSuccessContent } = select( storeName );

		if ( ! getSetupSuccessContent ) {
			return null;
		}

		return getSetupSuccessContent();
	} );
	const settingsAdminURL = useSelect( ( select ) =>
		select( CORE_SITE ).getAdminURL( 'googlesitekit-settings' )
	);

	const [ completeUserSetupSent, setCompleteUserSetupSent ] =
		useState( false );
	const [ completeSiteSetup, setCompleteSiteSetup ] = useState( false );

	useEffect( () => {
		// Only trigger the GA events if the notification is visible and we haven't
		// already sent these notifications.
		if (
			modules !== undefined &&
			notification === 'authentication_success'
		) {
			// Only trigger these events if this is a site/plugin setup event,
			// and not setup of an individual module (eg. AdSense, Analytics, etc.)
			if ( slug === null && ! completeUserSetupSent ) {
				trackEvent(
					`${ viewContext }_authentication-success-notification`,
					'complete_user_setup',
					isUsingProxy ? 'proxy' : 'custom-oauth'
				);

				setCompleteUserSetupSent( true );
			}

			// If the site doesn't yet have multiple admins, this is the initial
			// site setup so we can log the "site setup complete" event.
			if (
				slug === null &&
				! completeSiteSetup &&
				hasMultipleAdmins === false
			) {
				trackEvent(
					`${ viewContext }_authentication-success-notification`,
					'complete_site_setup',
					isUsingProxy ? 'proxy' : 'custom-oauth'
				);

				setCompleteSiteSetup( true );
			}
		}
	}, [
		canManageOptions,
		completeSiteSetup,
		completeUserSetupSent,
		hasMultipleAdmins,
		isUsingProxy,
		modules,
		notification,
		slug,
		viewContext,
	] );

	const onView = useCallback( () => {
		trackEvent(
			`${ viewContext }_authentication-success-notification`,
			'view_notification'
		);
	}, [ viewContext ] );

	const onDismiss = useCallback( async () => {
		await trackEvent(
			`${ viewContext }_authentication-success-notification`,
			'confirm_notification'
		);

		const modifiedURL = removeQueryArgs(
			global.location.href,
			'notification'
		);
		global.history.replaceState( null, '', modifiedURL );
	}, [ viewContext ] );

	if ( modules === undefined ) {
		return null;
	}

	// Only show the connected win when the user completes setup flow.
	if ( ! notification || '' === notification ) {
		return null;
	}

	if ( notification === 'authentication_success' && ! canManageOptions ) {
		return null;
	}

	if (
		notification === 'authentication_success' &&
		slug &&
		! modules[ slug ]?.active
	) {
		return null;
	}

	const winData = {
		id: 'connected-successfully',
		setupTitle: __( 'Site Kit', 'google-site-kit' ),
		description: '',
		learnMore: {
			label: '',
			url: '',
			description: '',
		},
	};

	switch ( notification ) {
		case 'authentication_success':
			if ( modules[ slug ] ) {
				winData.id = `${ winData.id }-${ slug }`;
				winData.setupTitle = modules[ slug ].name;
				winData.description = '';

				if ( setupSuccessContent ) {
					const { description, learnMore } = setupSuccessContent;
					winData.description = description;
					winData.learnMore = learnMore;
				}
			}

			const anchor = {
				link: '',
				label: '',
			};

			if ( 'pagespeed-insights' === slug ) {
				anchor.link = '#speed';
				anchor.label = __(
					'Jump to the bottom of the dashboard to see how fast your home page is',
					'google-site-kit'
				);
			}

			if (
				! (
					winData.description ||
					winData.learnMore.label ||
					anchor.label
				)
			) {
				winData.description = __(
					'Connect more services to see more stats.',
					'google-site-kit'
				);
				winData.learnMore = {
					label: __( 'Go to Settings', 'google-site-kit' ),
					url: `${ settingsAdminURL }#/connect-more-services`,
					target: LEARN_MORE_TARGET.INTERNAL,
				};
			}

			return (
				<Fragment>
					<BannerNotification
						id={ winData.id }
						title={ sprintf(
							/* translators: %s: the name of a module that setup was completed for */
							__(
								'Congrats on completing the setup for %s!',
								'google-site-kit'
							),
							winData.setupTitle
						) }
						description={ winData.description }
						handleDismiss={ () => {} }
						WinImageSVG={ SuccessGreenSVG }
						onView={ onView }
						dismiss={ __( 'OK, Got it!', 'google-site-kit' ) }
						onDismiss={ onDismiss }
						format="smaller"
						type="win-success"
						learnMoreLabel={ winData.learnMore.label }
						learnMoreDescription={ winData.learnMore.description }
						learnMoreURL={ winData.learnMore.url }
						learnMoreTarget={ winData.learnMore.target }
						anchorLink={ anchor.link }
						anchorLinkLabel={ anchor.label }
					/>
				</Fragment>
			);

		case 'user_input_success':
			return <UserInputSuccessBannerNotification />;
	}
}

export default SetupSuccessBannerNotification;
