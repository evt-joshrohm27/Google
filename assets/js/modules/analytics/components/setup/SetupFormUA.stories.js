/**
 * SetupFormUA component stories.
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
import { MODULES_ANALYTICS } from '../../datastore/constants';
import { MODULES_ANALYTICS_4 } from '../../../analytics-4/datastore/constants';
import {
	provideModules,
	provideModuleRegistrations,
	provideSiteInfo,
} from '../../../../../../tests/js/utils';
import ModuleSetup from '../../../../components/setup/ModuleSetup';
import WithRegistrySetup from '../../../../../../tests/js/WithRegistrySetup';
import * as fixtures from '../../datastore/__fixtures__';
import * as ga4Fixtures from '../../../analytics-4/datastore/__fixtures__';

const { accounts, properties, profiles } = fixtures.accountsPropertiesProfiles;
const accountID = accounts[ 0 ].id;

function Template() {
	return <ModuleSetup moduleSlug="analytics" />;
}

export const WithoutExistingTag = Template.bind( null );
WithoutExistingTag.storyName = 'Without Existing Tag';
WithoutExistingTag.decorators = [
	( Story ) => {
		const setupRegistry = ( registry ) => {
			registry.dispatch( MODULES_ANALYTICS ).selectAccount( accountID );
		};

		return (
			<WithRegistrySetup func={ setupRegistry }>
				<Story />
			</WithRegistrySetup>
		);
	},
];
WithoutExistingTag.scenario = {
	label: 'Modules/Analytics/Setup/SetupFormUA/WithoutExistingTag',
	delay: 250,
};

export const WithUATagNoPropertySelected = Template.bind( null );
WithUATagNoPropertySelected.storyName = 'With UA Tag, no property selected';
WithUATagNoPropertySelected.decorators = [
	( Story ) => {
		const setupRegistry = ( registry ) => {
			registry
				.dispatch( MODULES_ANALYTICS )
				.receiveGetExistingTag( properties[ 0 ].id );

			registry.dispatch( MODULES_ANALYTICS ).setUseSnippet( true );
		};

		return (
			<WithRegistrySetup func={ setupRegistry }>
				<Story />
			</WithRegistrySetup>
		);
	},
];

export const WithUATag = Template.bind( null );
WithUATag.storyName = 'With UA Tag, non-matching property selected';
WithUATag.decorators = [
	( Story ) => {
		const setupRegistry = ( registry ) => {
			registry.dispatch( MODULES_ANALYTICS ).selectAccount( accountID );

			registry.dispatch( MODULES_ANALYTICS ).selectProperty(
				properties[ 1 ].id,
				// eslint-disable-next-line sitekit/acronym-case
				properties[ 1 ].internalWebPropertyId
			);

			registry
				.dispatch( MODULES_ANALYTICS )
				.receiveGetExistingTag( properties[ 0 ].id );

			registry.dispatch( MODULES_ANALYTICS ).setUseSnippet( true );
		};

		return (
			<WithRegistrySetup func={ setupRegistry }>
				<Story />
			</WithRegistrySetup>
		);
	},
];

export const WithBothTags = Template.bind( null );
WithBothTags.storyName = 'With Both Tags, matching UA property selected';
WithBothTags.decorators = [
	( Story ) => {
		const setupRegistry = ( registry ) => {
			registry.dispatch( MODULES_ANALYTICS ).selectAccount( accountID );

			registry
				.dispatch( MODULES_ANALYTICS )
				.receiveGetExistingTag( properties[ 0 ].id );

			registry.dispatch( MODULES_ANALYTICS_4 ).receiveGetExistingTag(
				// eslint-disable-next-line sitekit/acronym-case
				ga4Fixtures.webDataStreams[ 0 ].webStreamData.measurementId
			);

			registry.dispatch( MODULES_ANALYTICS ).setUseSnippet( false );
			registry.dispatch( MODULES_ANALYTICS_4 ).setUseSnippet( true );
		};

		return (
			<WithRegistrySetup func={ setupRegistry }>
				<Story />
			</WithRegistrySetup>
		);
	},
];
WithBothTags.scenario = {
	label: 'Modules/Analytics/Setup/SetupFormUA/WithBothTags',
	delay: 1000,
};

export default {
	title: 'Modules/Analytics/Setup/SetupFormUA',
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

				registry.dispatch( MODULES_ANALYTICS ).receiveGetSettings( {
					adsConversionID: '',
					canUseSnippet: true,
				} );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetAccounts( accounts.slice( 0, 1 ) );
				registry.dispatch( MODULES_ANALYTICS ).receiveGetProperties(
					properties.slice( 0, 2 ).map( ( property ) => ( {
						...property,
						// eslint-disable-next-line sitekit/acronym-case
						websiteUrl: 'http://example.com',
					} ) ),
					{ accountID }
				);
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetProfiles( profiles, {
						accountID,
						propertyID: properties[ 0 ].id,
					} );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetProfiles( profiles, {
						accountID,
						propertyID: properties[ 1 ].id,
					} );
				registry
					.dispatch( MODULES_ANALYTICS )
					.receiveGetExistingTag( null );
				registry
					.dispatch( MODULES_ANALYTICS_4 )
					.receiveGetProperties( [], { accountID } );
			};

			return (
				<WithRegistrySetup func={ setupRegistry }>
					<Story />
				</WithRegistrySetup>
			);
		},
	],
	parameters: { padding: 0 },
};
