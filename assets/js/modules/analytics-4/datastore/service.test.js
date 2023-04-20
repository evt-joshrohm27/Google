/**
 * `modules/analytics-4` data store: service tests.
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
 *
 * Internal dependencies
 */
import { decodeServiceURL } from '../../../../../tests/js/mock-accountChooserURL-utils';
import {
	createTestRegistry,
	provideSiteInfo,
	provideUserInfo,
} from '../../../../../tests/js/utils';
import {
	REPORT_ARGS_DATA_FILTERS_KEY,
	REPORT_ARGS_NAV_KEY,
	REPORT_ARGS_SELECTED_DIMENSION_KEY,
	REPORT_ARGS_SELECTED_METRIC_KEY,
} from '../constants';
import { MODULES_ANALYTICS_4 } from './constants';

describe( 'module/analytics-4 service store', () => {
	const baseURI = 'https://analytics.google.com/analytics/web/';

	let registry;

	beforeEach( () => {
		registry = createTestRegistry();
		provideUserInfo( registry );
		provideSiteInfo( registry );
		registry.dispatch( MODULES_ANALYTICS_4 ).receiveGetSettings( {} );
	} );

	describe( 'selectors', () => {
		describe( 'getServiceReportURL', () => {
			const type = 'test-type';

			it( 'requires a report type', () => {
				expect( () =>
					registry.select( MODULES_ANALYTICS_4 ).getServiceReportURL()
				).toThrow( 'type is required to get a service report URL.' );
			} );

			it( 'returns `undefined` when no propertyID is set', () => {
				expect(
					registry.select( MODULES_ANALYTICS_4 ).getPropertyID()
				).toBeFalsy();

				expect(
					registry
						.select( MODULES_ANALYTICS_4 )
						.getServiceReportURL( type )
				).toBeUndefined();
			} );

			describe( 'with necessary account data', () => {
				const propertyID = '123456789';

				beforeEach( () => {
					registry
						.dispatch( MODULES_ANALYTICS_4 )
						.setPropertyID( propertyID );
				} );

				it( 'returns a service URL for the given report type for the current property', () => {
					const reportServiceURL = registry
						.select( MODULES_ANALYTICS_4 )
						.getServiceReportURL( type );

					const decodedServiceURL =
						decodeServiceURL( reportServiceURL );
					const url = new URL( decodedServiceURL );

					expect( decodedServiceURL.startsWith( baseURI ) ).toBe(
						true
					);
					expect( url.hash ).toBe(
						`#/p${ propertyID }/reports/explorer?params=${ REPORT_ARGS_NAV_KEY }=maui&r=${ type }`
					);
				} );

				it( 'returns a service URL for the given report type including any extra report-specific arguments', () => {
					const reportArgs = {
						dates: {
							startDate: '2023-01-23',
							endDate: '2023-01-24',
							compareStartDate: '2023-02-12',
							compareEndDate: '2023-02-13',
						},
						details: {
							metric: 'totalUsers',
							dimension: 'country',
						},
						filters: {
							sessionSource: 'google',
							unifiedPagePathScreen: '/some-path',
						},
						otherArgs: {
							// eslint-disable-next-line sitekit/acronym-case
							collectionId: 'some-collection-id',
						},
					};
					const reportServiceURL = registry
						.select( MODULES_ANALYTICS_4 )
						.getServiceReportURL( type, reportArgs );

					const decodedServiceURL =
						decodeServiceURL( reportServiceURL );

					const url = new URL( decodedServiceURL );

					expect( decodedServiceURL.startsWith( baseURI ) ).toBe(
						true
					);

					expect( url.hash ).toMatch(
						new RegExp(
							`#/p${ propertyID }/reports/explorer\\?params=.*&r=${ type }&collectionId=some-collection-id`
						)
					);

					const matches = /params=(.*)&r=/.exec( url.hash );
					const embeddedParams = matches[ 1 ];

					const searchParams = new global.URLSearchParams(
						embeddedParams
					);

					expect( Object.fromEntries( searchParams ) ).toEqual( {
						[ REPORT_ARGS_NAV_KEY ]: 'maui',
						// Date args:
						'_u.date00': '20230123',
						'_u.date01': '20230124',
						'_u.date10': '20230212',
						'_u.date11': '20230213',
						// Detail args:
						[ REPORT_ARGS_SELECTED_METRIC_KEY ]: JSON.stringify( [
							'totalUsers',
						] ),
						[ REPORT_ARGS_SELECTED_DIMENSION_KEY ]: JSON.stringify(
							[ 'country' ]
						),
						// Filter args:
						[ REPORT_ARGS_DATA_FILTERS_KEY ]: JSON.stringify( [
							{
								type: 1,
								fieldName: 'sessionSource',
								evaluationType: 1,
								expressionList: [ 'google' ],
								complement: false,
								isCaseSensitive: true,
								expression: '',
							},
							{
								type: 1,
								fieldName: 'unifiedPagePathScreen',
								evaluationType: 1,
								expressionList: [ '/some-path' ],
								complement: false,
								isCaseSensitive: true,
								expression: '',
							},
						] ),
					} );
				} );
			} );
		} );
	} );
} );
