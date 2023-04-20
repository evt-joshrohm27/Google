/**
 * Analytics SettingsView component stories.
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
 * Internal dependencies
 */
import SettingsView from './SettingsView';
import { Cell, Grid, Row } from '../../../../material-components';
import {
	DASHBOARD_VIEW_GA4,
	MODULES_ANALYTICS,
} from '../../datastore/constants';
import { MODULES_ANALYTICS_4 } from '../../../analytics-4/datastore/constants';
import {
	provideModules,
	provideModuleRegistrations,
	provideSiteInfo,
} from '../../../../../../tests/js/utils';
import WithRegistrySetup from '../../../../../../tests/js/WithRegistrySetup';
import * as fixtures from '../../datastore/__fixtures__';
import * as ga4Fixtures from '../../../analytics-4/datastore/__fixtures__';

const accounts = fixtures.accountsPropertiesProfiles.accounts.slice( 0, 1 );
const properties = [
	{
		...fixtures.accountsPropertiesProfiles.properties[ 0 ],
		websiteUrl: 'http://example.com', // eslint-disable-line sitekit/acronym-case
	},
	{
		...fixtures.accountsPropertiesProfiles.properties[ 1 ],
	},
];

const accountID = accounts[ 0 ].id;

function Template( { setupRegistry = () => {}, ...args } ) {
	return (
		<WithRegistrySetup func={ setupRegistry }>
			<div className="googlesitekit-layout">
				<div className="googlesitekit-settings-module googlesitekit-settings-module--active googlesitekit-settings-module--analytics">
					<div className="googlesitekit-settings-module__content googlesitekit-settings-module__content--open">
						<Grid>
							<Row>
								<Cell size={ 12 }>
									<SettingsView { ...args } />
								</Cell>
							</Row>
						</Grid>
					</div>
				</div>
			</div>
		</WithRegistrySetup>
	);
}

export const WithGA4MeasurementID = Template.bind( null );
WithGA4MeasurementID.storyName = 'Settings with GA4 Measurement ID';

export const WithGA4Snippet = Template.bind( null );
WithGA4Snippet.storyName = 'Settings with GA4 Snippet inserted';
WithGA4Snippet.args = {
	setupRegistry: ( registry ) => {
		registry.dispatch( MODULES_ANALYTICS_4 ).receiveGetSettings( {
			useSnippet: true,
		} );
	},
};

export const WithDashboardView = Template.bind( null );
WithDashboardView.storyName = 'Settings with Dashboard View';
WithDashboardView.args = {
	setupRegistry: ( registry ) => {
		registry.dispatch( MODULES_ANALYTICS ).selectProperty(
			properties[ 0 ].id,
			// eslint-disable-next-line sitekit/acronym-case
			properties[ 0 ].internalWebPropertyId
		);

		registry
			.dispatch( MODULES_ANALYTICS )
			.setDashboardView( DASHBOARD_VIEW_GA4 );
	},
};
WithDashboardView.parameters = {
	features: [ 'ga4Reporting' ],
};
WithDashboardView.scenario = {
	label: 'Modules/Analytics/Settings/SettingsView/WithDashboardView',
	delay: 250,
};

export default {
	title: 'Modules/Analytics/Settings/SettingsView',
	decorators: [
		( Story ) => {
			const setupRegistry = ( registry ) => {
				provideModules( registry, [
					{
						slug: 'analytics',
						active: true,
						connected: true,
					},
					{
						slug: 'analytics-4',
						active: true,
						connected: true,
					},
				] );
				provideSiteInfo( registry );
				provideModuleRegistrations( registry );

				registry
					.dispatch( MODULES_ANALYTICS_4 )
					.receiveGetSettings( {} );
				registry
					.dispatch( MODULES_ANALYTICS_4 )
					.receiveGetExistingTag( null );
				registry
					.dispatch( MODULES_ANALYTICS_4 )
					.receiveGetProperties( ga4Fixtures.properties, {
						accountID,
					} );
				registry
					.dispatch( MODULES_ANALYTICS_4 )
					.receiveGetWebDataStreams( ga4Fixtures.webDataStreams, {
						propertyID: ga4Fixtures.properties[ 0 ]._id,
					} );

				registry.dispatch( MODULES_ANALYTICS ).receiveGetSettings( {
					useSnippet: true,
					canUseSnippet: true,
				} );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetExistingTag( null );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetAccounts( accounts );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetProperties( properties, { accountID } );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetProfiles(
						fixtures.accountsPropertiesProfiles.profiles,
						{ accountID, propertyID: properties[ 0 ].id }
					);
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetProfiles(
						fixtures.accountsPropertiesProfiles.profiles,
						{ accountID, propertyID: properties[ 1 ].id }
					);

				registry
					.dispatch( MODULES_ANALYTICS )
					.selectAccount( accountID );
			};

			return (
				<WithRegistrySetup func={ setupRegistry }>
					<Story />
				</WithRegistrySetup>
			);
		},
	],
};
