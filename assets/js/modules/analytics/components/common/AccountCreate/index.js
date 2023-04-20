/**
 * AccountCreate component.
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
import { __ } from '@wordpress/i18n';
import { useCallback, useState, useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { Button, ProgressBar } from 'googlesitekit-components';
import {
	MODULES_ANALYTICS,
	FORM_ACCOUNT_CREATE,
	PROVISIONING_SCOPE,
	EDIT_SCOPE,
} from '../../../datastore/constants';
import { MODULES_ANALYTICS_4 } from '../../../../analytics-4/datastore/constants';
import { CORE_SITE } from '../../../../../googlesitekit/datastore/site/constants';
import { CORE_USER } from '../../../../../googlesitekit/datastore/user/constants';
import { CORE_FORMS } from '../../../../../googlesitekit/datastore/forms/constants';
import { CORE_LOCATION } from '../../../../../googlesitekit/datastore/location/constants';
import { ERROR_CODE_MISSING_REQUIRED_SCOPE } from '../../../../../util/errors';
import { trackEvent } from '../../../../../util';
import { getAccountDefaults as getAccountDefaultsUA } from '../../../util/account';
import { getAccountDefaults as getAccountDefaultsGA4 } from '../../../../analytics-4/utils/account';
import { Cell } from '../../../../../material-components';
import Link from '../../../../../components/Link';
import StoreErrorNotices from '../../../../../components/StoreErrorNotices';
import GA4PropertyNotice from '../GA4PropertyNotice';
import TimezoneSelect from './TimezoneSelect';
import AccountField from './AccountField';
import PropertyField from './PropertyField';
import ProfileField from './ProfileField';
import CountrySelect from './CountrySelect';
import WebDataStreamField from './WebDataStreamField';
import useViewContext from '../../../../../hooks/useViewContext';
import { useFeature } from '../../../../../hooks/useFeature';
const { useDispatch, useSelect } = Data;

export default function AccountCreate() {
	const ga4ReportingEnabled = useFeature( 'ga4Reporting' );

	const [ isNavigating, setIsNavigating ] = useState( false );
	const accounts = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getAccounts()
	);
	const hasResolvedAccounts = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).hasFinishedResolution( 'getAccounts' )
	);
	const uaAccountTicketTermsOfServiceURL = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getAccountTicketTermsOfServiceURL()
	);
	const ga4AccountTicketTermsOfServiceURL = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).getAccountTicketTermsOfServiceURL()
	);
	const canSubmitAccountCreateUA = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).canSubmitAccountCreate()
	);
	const canSubmitAccountCreateGA4 = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).canSubmitAccountCreate()
	);
	const isDoingCreateAccountUA = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).isDoingCreateAccount()
	);
	const isDoingCreateAccountGA4 = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).isDoingCreateAccount()
	);
	const hasProvisioningScope = useSelect( ( select ) =>
		select( CORE_USER ).hasScope( PROVISIONING_SCOPE )
	);
	const hasEditScope = useSelect( ( select ) =>
		select( CORE_USER ).hasScope( EDIT_SCOPE )
	);
	const hasAccountCreateForm = useSelect( ( select ) =>
		select( CORE_FORMS ).hasForm( FORM_ACCOUNT_CREATE )
	);
	const autoSubmit = useSelect( ( select ) =>
		select( CORE_FORMS ).getValue( FORM_ACCOUNT_CREATE, 'autoSubmit' )
	);
	const siteURL = useSelect( ( select ) =>
		select( CORE_SITE ).getReferenceSiteURL()
	);
	const siteName = useSelect( ( select ) =>
		select( CORE_SITE ).getSiteName()
	);
	const timezone = useSelect( ( select ) =>
		select( CORE_SITE ).getTimezone()
	);

	const viewContext = useViewContext();
	const { setValues } = useDispatch( CORE_FORMS );
	const { navigateTo } = useDispatch( CORE_LOCATION );
	const { createAccount } = useDispatch(
		ga4ReportingEnabled ? MODULES_ANALYTICS_4 : MODULES_ANALYTICS
	);
	const { setPermissionScopeError } = useDispatch( CORE_USER );

	const getAccountDefaults = ga4ReportingEnabled
		? getAccountDefaultsGA4
		: getAccountDefaultsUA;

	const hasRequiredScope = ga4ReportingEnabled
		? hasEditScope
		: hasProvisioningScope;

	const isDoingCreateAccount = ga4ReportingEnabled
		? isDoingCreateAccountGA4
		: isDoingCreateAccountUA;

	const canSubmitAccountCreate = ga4ReportingEnabled
		? canSubmitAccountCreateGA4
		: canSubmitAccountCreateUA;

	const accountTicketTermsOfServiceURL = ga4ReportingEnabled
		? ga4AccountTicketTermsOfServiceURL
		: uaAccountTicketTermsOfServiceURL;

	// Redirect if the accountTicketTermsOfServiceURL is set.
	useEffect( () => {
		if ( accountTicketTermsOfServiceURL ) {
			navigateTo( accountTicketTermsOfServiceURL );
		}
	}, [ accountTicketTermsOfServiceURL, navigateTo ] );

	// Set form defaults on initial render.
	useEffect( () => {
		// Only set the form if not already present in store.
		// e.g. after a snapshot has been restored.
		if ( ! hasAccountCreateForm ) {
			setValues(
				FORM_ACCOUNT_CREATE,
				getAccountDefaults( {
					siteName,
					siteURL,
					timezone,
				} )
			);
		}
	}, [
		hasAccountCreateForm,
		siteName,
		siteURL,
		timezone,
		setValues,
		getAccountDefaults,
	] );

	const handleSubmit = useCallback( async () => {
		const scopes = [];

		if ( ! hasProvisioningScope || ! hasEditScope ) {
			scopes.push( PROVISIONING_SCOPE );
			scopes.push( EDIT_SCOPE );
		}

		// If scope not granted, trigger scope error right away. These are
		// typically handled automatically based on API responses, but
		// this particular case has some special handling to improve UX.
		if ( scopes.length > 0 ) {
			// When state is restored, auto-submit the request again.
			setValues( FORM_ACCOUNT_CREATE, { autoSubmit: true } );
			setPermissionScopeError( {
				code: ERROR_CODE_MISSING_REQUIRED_SCOPE,
				message: __(
					'Additional permissions are required to create a new Analytics account.',
					'google-site-kit'
				),
				data: {
					status: 403,
					scopes,
					skipModal: true,
				},
			} );
			return;
		}

		setValues( FORM_ACCOUNT_CREATE, { autoSubmit: false } );
		await trackEvent(
			`${ viewContext }_analytics`,
			'create_account',
			'proxy'
		);

		const { error } = await createAccount();
		if ( ! error ) {
			setIsNavigating( true );
		}
	}, [
		createAccount,
		setIsNavigating,
		hasProvisioningScope,
		hasEditScope,
		setPermissionScopeError,
		setValues,
		viewContext,
	] );

	// If the user ends up back on this component with the required scope granted,
	// and already submitted the form, trigger the submit again.
	useEffect( () => {
		if ( hasRequiredScope && autoSubmit ) {
			handleSubmit();
		}
	}, [ hasRequiredScope, autoSubmit, handleSubmit ] );

	// If the user clicks "Back", rollback settings to restore saved values, if any.
	const { rollbackSettings } = useDispatch( MODULES_ANALYTICS );
	const handleBack = useCallback(
		() => rollbackSettings(),
		[ rollbackSettings ]
	);

	if (
		isDoingCreateAccount ||
		isNavigating ||
		! hasResolvedAccounts ||
		hasRequiredScope === undefined
	) {
		return <ProgressBar />;
	}

	return (
		<div>
			<StoreErrorNotices
				moduleSlug="analytics"
				storeName={ MODULES_ANALYTICS }
			/>

			<h3 className="googlesitekit-heading-4">
				{ __( 'Create your Analytics account', 'google-site-kit' ) }
			</h3>

			<p>
				{ __(
					'We’ve pre-filled the required information for your new account. Confirm or edit any details:',
					'google-site-kit'
				) }
			</p>

			<div className="googlesitekit-setup-module__inputs">
				<Cell size={ 6 }>
					<AccountField />
				</Cell>
				<Cell size={ 6 }>
					<PropertyField />
				</Cell>
				<Cell size={ 6 }>
					{ ga4ReportingEnabled && <WebDataStreamField /> }
					{ ! ga4ReportingEnabled && <ProfileField /> }
				</Cell>
			</div>

			<div className="googlesitekit-setup-module__inputs">
				<CountrySelect />

				<TimezoneSelect />
			</div>

			<p>
				{ hasRequiredScope && (
					<span>
						{ __(
							'You will be redirected to Google Analytics to accept the terms of service.',
							'google-site-kit'
						) }
					</span>
				) }
				{ ! hasRequiredScope && (
					<span>
						{ __(
							'You will need to give Site Kit permission to create an Analytics account on your behalf and also accept the Google Analytics terms of service.',
							'google-site-kit'
						) }
					</span>
				) }
			</p>

			{ ! ga4ReportingEnabled && (
				<GA4PropertyNotice
					notice={ __(
						'This will create both a Google Analytics 4 and Universal Analytics property.',
						'google-site-kit'
					) }
				/>
			) }

			<div className="googlesitekit-setup-module__action">
				<Button
					disabled={ ! canSubmitAccountCreate }
					onClick={ handleSubmit }
				>
					{ __( 'Create Account', 'google-site-kit' ) }
				</Button>

				{ accounts && !! accounts.length && (
					<Link
						className="googlesitekit-setup-module__sub-action"
						onClick={ handleBack }
					>
						{ __( 'Back', 'google-site-kit' ) }
					</Link>
				) }
			</div>
		</div>
	);
}
