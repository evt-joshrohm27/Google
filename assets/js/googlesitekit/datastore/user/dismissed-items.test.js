/**
 * `core/user` data store: dismissed items tests.
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
import { CORE_USER } from './constants';
import {
	createTestRegistry,
	muteFetch,
	untilResolved,
} from '../../../../../tests/js/utils';

describe( 'core/user dismissed-items', () => {
	const fetchGetDismissedItems = new RegExp(
		'^/google-site-kit/v1/core/user/data/dismissed-items'
	);
	const fetchDismissItem = new RegExp(
		'^/google-site-kit/v1/core/user/data/dismiss-item'
	);

	let registry;

	beforeEach( () => {
		registry = createTestRegistry();
	} );

	describe( 'actions', () => {
		describe( 'dismissItem', () => {
			it( 'should save settings and return new dismissed items', async () => {
				fetchMock.postOnce( fetchDismissItem, {
					body: [ 'foo', 'bar', 'baz' ],
				} );

				await registry
					.dispatch( CORE_USER )
					.dismissItem( 'baz', { expiresInSeconds: 3 } );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched( fetchDismissItem, {
					body: {
						data: {
							slug: 'baz',
							expiration: 3,
						},
					},
				} );

				const dismissedItems = registry
					.select( CORE_USER )
					.getDismissedItems();
				expect( dismissedItems ).toEqual( [ 'foo', 'bar', 'baz' ] );
				expect( fetchMock ).toHaveFetchedTimes( 1 );
			} );

			it( 'should dispatch an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};

				fetchMock.post( fetchDismissItem, {
					body: response,
					status: 500,
				} );

				await registry.dispatch( CORE_USER ).dismissItem( 'baz' );
				expect(
					registry
						.select( CORE_USER )
						.getErrorForAction( 'dismissItem', [ 'baz', 0 ] )
				).toMatchObject( response );
				expect( console ).toHaveErrored();
			} );
		} );
	} );

	describe( 'selectors', () => {
		describe( 'getDismissedItems', () => {
			it( 'should return undefined util resolved', async () => {
				muteFetch( fetchGetDismissedItems, [] );
				expect(
					registry.select( CORE_USER ).getDismissedItems()
				).toBeUndefined();
				await untilResolved( registry, CORE_USER ).getDismissedItems();
			} );

			it( 'should return dismissed items received from API', async () => {
				fetchMock.getOnce( fetchGetDismissedItems, {
					body: [ 'foo', 'bar' ],
				} );

				const dismissedItems = registry
					.select( CORE_USER )
					.getDismissedItems();
				expect( dismissedItems ).toBeUndefined();

				await untilResolved( registry, CORE_USER ).getDismissedItems();

				expect(
					registry.select( CORE_USER ).getDismissedItems()
				).toEqual( [ 'foo', 'bar' ] );
				expect( fetchMock ).toHaveFetched();
			} );

			it( 'should throw an error', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};

				fetchMock.getOnce( fetchGetDismissedItems, {
					body: response,
					status: 500,
				} );

				const dismissedItems = registry
					.select( CORE_USER )
					.getDismissedItems();
				expect( dismissedItems ).toBeUndefined();

				await untilResolved( registry, CORE_USER ).getDismissedItems();

				registry.select( CORE_USER ).getDismissedItems();

				const error = registry
					.select( CORE_USER )
					.getErrorForSelector( 'getDismissedItems' );
				expect( error ).toMatchObject( response );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( console ).toHaveErrored();
			} );
		} );

		describe( 'isItemDismissed', () => {
			it( 'should return undefined if getDismissedItems selector is not resolved yet', async () => {
				fetchMock.getOnce( fetchGetDismissedItems, { body: [] } );
				expect(
					registry.select( CORE_USER ).isItemDismissed( 'foo' )
				).toBeUndefined();
				await untilResolved( registry, CORE_USER ).getDismissedItems();
			} );

			it( 'should return TRUE if the item is dismissed', () => {
				registry
					.dispatch( CORE_USER )
					.receiveGetDismissedItems( [ 'foo', 'bar' ] );
				expect(
					registry.select( CORE_USER ).isItemDismissed( 'foo' )
				).toBe( true );
			} );

			it( 'should return FALSE if the item is not dismissed', () => {
				registry
					.dispatch( CORE_USER )
					.receiveGetDismissedItems( [ 'foo', 'bar' ] );
				expect(
					registry.select( CORE_USER ).isItemDismissed( 'baz' )
				).toBe( false );
			} );
		} );

		describe( 'isDismissingItem', () => {
			it( 'returns true while item dismissal is in progress', () => {
				const slug = 'foo-bar';

				muteFetch( fetchDismissItem );

				expect(
					registry.select( CORE_USER ).isDismissingItem( slug )
				).toBe( false );

				registry.dispatch( CORE_USER ).dismissItem( slug );

				expect(
					registry.select( CORE_USER ).isDismissingItem( slug )
				).toBe( true );
			} );

			it( 'returns false while item dismissal is over', async () => {
				const slug = 'foo-bar';

				fetchMock.postOnce( fetchDismissItem, { body: [ slug ] } );

				expect(
					registry.select( CORE_USER ).isDismissingItem( slug )
				).toBe( false );

				await registry.dispatch( CORE_USER ).dismissItem( slug );

				expect(
					registry.select( CORE_USER ).isDismissingItem( slug )
				).toBe( false );
			} );
		} );
	} );
} );
