/**
 * UA Settings View component.
 *
 * Site Kit by Google, Copyright 2023 Google LLC
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
import { createInterpolateElement, Fragment } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import DisplaySetting from '../../../../components/DisplaySetting';
import { MODULES_ANALYTICS } from '../../datastore/constants';
import Link from '../../../../components/Link';
import VisuallyHidden from '../../../../components/VisuallyHidden';
import { escapeURI } from '../../../../util/escape-uri';
import { useFeature } from '../../../../hooks/useFeature';
const { useSelect } = Data;

export default function UASettingsView() {
	const ga4ReportingEnabled = useFeature( 'ga4Reporting' );
	const accountID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getAccountID()
	);
	const propertyID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getPropertyID()
	);
	const profileID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getProfileID()
	);
	const internalWebPropertyID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getInternalWebPropertyID()
	);
	const editViewSettingsURL = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getServiceURL( {
			path: escapeURI`/a${ accountID }w${ internalWebPropertyID }p${ profileID }/admin/view/settings`,
		} )
	);
	const useSnippet = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getUseSnippet()
	);
	const canUseSnippet = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getCanUseSnippet()
	);
	const hasExistingTag = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).hasExistingTag()
	);

	let propetyMeta;
	if ( ga4ReportingEnabled ) {
		propetyMeta = __( 'Universal Analytics Property', 'google-site-kit' );
	} else {
		propetyMeta = __( 'Property', 'google-site-kit' );
	}

	return (
		<Fragment>
			<div className="googlesitekit-settings-module__meta-items">
				{ ! ga4ReportingEnabled && (
					<div className="googlesitekit-settings-module__meta-item">
						<h5 className="googlesitekit-settings-module__meta-item-type">
							{ __( 'Account', 'google-site-kit' ) }
						</h5>
						<p className="googlesitekit-settings-module__meta-item-data">
							<DisplaySetting value={ accountID } />
						</p>
					</div>
				) }
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ propetyMeta }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						<DisplaySetting value={ propertyID } />
					</p>
				</div>
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __( 'View', 'google-site-kit' ) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						<DisplaySetting value={ profileID } />
					</p>
				</div>
				<div className="googlesitekit-settings-module__meta-item googlesitekit-settings-module__meta-item--data-only">
					<p className="googlesitekit-settings-module__meta-item-data googlesitekit-settings-module__meta-item-data--tiny">
						<Link href={ editViewSettingsURL } external>
							{ createInterpolateElement(
								__(
									'Edit <VisuallyHidden>Universal Analytics property view </VisuallyHidden>in Analytics',
									'google-site-kit'
								),
								{
									VisuallyHidden: <VisuallyHidden />,
								}
							) }
						</Link>
					</p>
				</div>
			</div>
			<div className="googlesitekit-settings-module__meta-items">
				<div className="googlesitekit-settings-module__meta-item">
					<h5 className="googlesitekit-settings-module__meta-item-type">
						{ __(
							'Universal Analytics Code Snippet',
							'google-site-kit'
						) }
					</h5>
					<p className="googlesitekit-settings-module__meta-item-data">
						{ canUseSnippet === false && (
							<span>
								{ __(
									'The code is controlled by the Tag Manager module',
									'google-site-kit'
								) }
							</span>
						) }
						{ canUseSnippet && useSnippet && (
							<span>
								{ __(
									'Snippet is inserted',
									'google-site-kit'
								) }
							</span>
						) }
						{ canUseSnippet && ! useSnippet && ! hasExistingTag && (
							<span>
								{ __(
									'Snippet is not inserted',
									'google-site-kit'
								) }
							</span>
						) }
						{ canUseSnippet && ! useSnippet && hasExistingTag && (
							<span>
								{ __(
									'Inserted by another plugin or theme',
									'google-site-kit'
								) }
							</span>
						) }
					</p>
				</div>
			</div>
		</Fragment>
	);
}
