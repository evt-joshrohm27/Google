/**
 * AdSense Settings View component.
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

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import DisplaySetting from '../../../../components/DisplaySetting';
import Link from '../../../../components/Link';
import { useFeature } from '../../../../hooks/useFeature';
import { CORE_SITE } from '../../../../googlesitekit/datastore/site/constants';
import { MODULES_ADSENSE } from '../../datastore/constants';
import { ErrorNotices } from '../common';
import {
	getAccountStatusLabel,
	getSiteStatusLabel,
	getSiteStatusLinkLabel,
	getSnippetLabel,
	getAutoAdsDisabledMessage,
} from './utils';
const { useSelect } = Data;

export default function SettingsView() {
	const adsenseSetupV2Enabled = useFeature( 'adsenseSetupV2' );

	const accountID = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getAccountID()
	);
	const siteStatusURL = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getServiceAccountManageSitesURL()
	);
	const webStoriesActive = useSelect( ( select ) =>
		select( CORE_SITE ).isWebStoriesActive()
	);
	const webStoriesAdUnit = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getWebStoriesAdUnit()
	);
	const accountStatus = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getAccountStatus()
	);
	const siteStatus = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getSiteStatus()
	);
	const useSnippet = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getUseSnippet()
	);
	const existingTag = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getExistingTag()
	);
	const clientID = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getClientID()
	);
	const autoAdsDisabled = useSelect(
		( select ) => select( MODULES_ADSENSE ).getAutoAdsDisabled() || []
	);

	const accountStatusLabel = getAccountStatusLabel( accountStatus );

	const siteStatusLabel = getSiteStatusLabel( siteStatus );

	const siteStatusLinkLabel = getSiteStatusLinkLabel( adsenseSetupV2Enabled );

	const snippetLabel = getSnippetLabel( useSnippet, existingTag, clientID );

	const autoAdsDisabledMessage = getAutoAdsDisabledMessage( autoAdsDisabled );

	return (
		<div className="googlesitekit-setup-module googlesitekit-setup-module--adsense">
			<ErrorNotices />

			<div className="googlesitekit-settings-module__meta-items">
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __( 'Publisher ID', 'google-site-kit' ) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						<DisplaySetting value={ accountID } />
					</p>
				</div>
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __( 'Account Status', 'google-site-kit' ) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						{ accountStatusLabel }
					</p>
				</div>
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __( 'Site Status', 'google-site-kit' ) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						{ adsenseSetupV2Enabled && siteStatusLabel + ' ' }
						<Link
							href={ siteStatusURL }
							className="googlesitekit-settings-module__cta-button"
							external
							disabled={ siteStatusURL === undefined }
							hideExternalIndicator={
								siteStatusURL === undefined
							}
						>
							{ siteStatusLinkLabel }
						</Link>
					</p>
				</div>
			</div>

			<div className="googlesitekit-settings-module__meta-items">
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __( 'AdSense Code', 'google-site-kit' ) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						{ snippetLabel }
					</p>
				</div>
			</div>

			<div className="googlesitekit-settings-module__meta-items">
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __( 'Excluded from ads', 'google-site-kit' ) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						{ autoAdsDisabledMessage }
					</p>
				</div>
			</div>

			{ webStoriesActive && (
				<div className="googlesitekit-settings-module__meta-items">
					<div className="googlesitekit-settings-module__meta-item">
						<div className="googlesitekit-settings-module__meta-item">
							<h5 className="googlesitekit-settings-module__meta-item-type">
								{ __(
									'Web Stories Ad Unit',
									'google-site-kit'
								) }
							</h5>
							<p className="googlesitekit-settings-module__meta-item-data">
								{ ! webStoriesAdUnit && (
									<span>
										{ __( 'None', 'google-site-kit' ) }
									</span>
								) }
								{ webStoriesAdUnit && (
									<DisplaySetting
										value={ webStoriesAdUnit }
									/>
								) }
							</p>
						</div>
					</div>
				</div>
			) }
		</div>
	);
}
