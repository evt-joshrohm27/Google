/**
 * `modules/search-console` data store: report tests.
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
import API from 'googlesitekit-api';
import { MODULES_SEARCH_CONSOLE } from './constants';
import {
	createTestRegistry,
	freezeFetch,
	muteFetch,
	subscribeUntil,
	unsubscribeFromAll,
	untilResolved,
	waitForDefaultTimeouts,
} from '../../../../../tests/js/utils';
import * as fixtures from './__fixtures__';

describe( 'modules/search-console report', () => {
	const searchAnalyticsRegexp = new RegExp(
		'^/google-site-kit/v1/modules/search-console/data/searchanalytics'
	);
	const errorResponse = {
		status: 403,
		body: {
			code: 403,
			message:
				'User does not have sufficient permissions for this profile.',
			data: { status: 403, reason: 'forbidden' },
		},
	};
	const consoleError = [
		'Google Site Kit API Error',
		'method:GET',
		'datapoint:searchanalytics',
		'type:modules',
		'identifier:search-console',
		'error:"User does not have sufficient permissions for this profile."',
	];

	let registry;

	beforeAll( () => {
		API.setUsingCache( false );
	} );

	beforeEach( () => {
		registry = createTestRegistry();
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
	} );

	afterAll( () => {
		API.setUsingCache( true );
	} );

	describe( 'selectors', () => {
		describe( 'getReport', () => {
			it( 'uses a resolver to make a network request', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, {
					body: fixtures.report,
				} );

				const initialReport = registry
					.select( MODULES_SEARCH_CONSOLE )
					.getReport( {
						dateRange: 'last-90-days',
					} );

				expect( initialReport ).toEqual( undefined );
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_SEARCH_CONSOLE )
							.getReport( { dateRange: 'last-90-days' } ) !==
						undefined
				);

				const report = registry
					.select( MODULES_SEARCH_CONSOLE )
					.getReport( { dateRange: 'last-90-days' } );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( report ).toEqual( fixtures.report );
			} );

			it( 'does not make a network request if report for given options is already present', async () => {
				const options = {
					dateRange: 'last-90-days',
				};

				// Load data into this store so there are matches for the data we're about to select,
				// even though the selector hasn't fulfilled yet.
				registry
					.dispatch( MODULES_SEARCH_CONSOLE )
					.receiveGetReport( fixtures.report, { options } );

				const report = registry
					.select( MODULES_SEARCH_CONSOLE )
					.getReport( options );

				await subscribeUntil( registry, () =>
					registry
						.select( MODULES_SEARCH_CONSOLE )
						.hasFinishedResolution( 'getReport', [ options ] )
				);

				expect( fetchMock ).not.toHaveFetched();
				expect( report ).toEqual( fixtures.report );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};

				fetchMock.getOnce( searchAnalyticsRegexp, {
					body: response,
					status: 500,
				} );

				const options = {
					dateRange: 'last-90-days',
				};

				registry.select( MODULES_SEARCH_CONSOLE ).getReport( options );
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_SEARCH_CONSOLE )
							.isFetchingGetReport( options ) === false
				);

				expect( fetchMock ).toHaveFetchedTimes( 1 );

				const report = registry
					.select( MODULES_SEARCH_CONSOLE )
					.getReport( options );
				expect( report ).toEqual( undefined );

				await untilResolved(
					registry,
					MODULES_SEARCH_CONSOLE
				).getReport( options );
				expect( console ).toHaveErrored();
			} );
		} );

		describe( 'isGatheringData', () => {
			it( 'should return undefined if getReport is not resolved yet', async () => {
				freezeFetch( searchAnalyticsRegexp );

				const { isGatheringData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( isGatheringData() ).toBeUndefined();

				// Wait for resolvers to run.
				await waitForDefaultTimeouts();
			} );

			it( 'should return TRUE if the returned report is an empty array', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, { body: [] } );

				const { isGatheringData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( isGatheringData() ).toBeUndefined();

				await subscribeUntil(
					registry,
					() => isGatheringData() !== undefined
				);

				expect( isGatheringData() ).toBe( true );
			} );

			it( 'should return FALSE if the report API returns error', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, errorResponse );

				muteFetch(
					new RegExp(
						'^/google-site-kit/v1/modules/search-console/data/data-available'
					)
				);

				const { isGatheringData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( isGatheringData() ).toBeUndefined();

				await subscribeUntil(
					registry,
					() => isGatheringData() !== undefined
				);

				expect( console ).toHaveErroredWith( ...consoleError );

				expect( isGatheringData() ).toBe( false );
			} );

			it( 'should return FALSE if the returned report has rows', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, {
					body: fixtures.report,
				} );

				muteFetch(
					new RegExp(
						'^/google-site-kit/v1/modules/search-console/data/data-available'
					)
				);

				const { isGatheringData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( isGatheringData() ).toBeUndefined();

				await subscribeUntil(
					registry,
					() => isGatheringData() !== undefined
				);

				expect( isGatheringData() ).toBe( false );
			} );
		} );

		describe( 'hasZeroData', () => {
			it( 'should return undefined if getReport or isGatheringData is not resolved yet', async () => {
				freezeFetch( searchAnalyticsRegexp );

				const { hasZeroData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( hasZeroData() ).toBeUndefined();

				// Wait for resolvers to run.
				await waitForDefaultTimeouts();
			} );

			it( 'should return TRUE if report data in isGatheringData OR isZeroReport is an empty array', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, { body: [] } );

				const { hasZeroData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( hasZeroData() ).toBeUndefined();

				await subscribeUntil(
					registry,
					() => hasZeroData() !== undefined
				);

				expect( hasZeroData() ).toBe( true );
			} );

			it( 'should return FALSE if report API returns error', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, errorResponse );

				muteFetch(
					new RegExp(
						'^/google-site-kit/v1/modules/search-console/data/data-available'
					)
				);

				const { hasZeroData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( hasZeroData() ).toBeUndefined();

				await subscribeUntil(
					registry,
					() => hasZeroData() !== undefined
				);

				expect( console ).toHaveErroredWith( ...consoleError );

				expect( hasZeroData() ).toBe( false );
			} );

			it( 'should return false if isGatheringData and isZeroReport return false', async () => {
				fetchMock.getOnce( searchAnalyticsRegexp, {
					body: fixtures.report,
				} );

				muteFetch(
					new RegExp(
						'^/google-site-kit/v1/modules/search-console/data/data-available'
					)
				);

				const { hasZeroData } = registry.select(
					MODULES_SEARCH_CONSOLE
				);

				expect( hasZeroData() ).toBeUndefined();

				await subscribeUntil(
					registry,
					() => hasZeroData() !== undefined
				);

				expect( hasZeroData() ).toBe( false );
			} );
		} );
	} );
} );
