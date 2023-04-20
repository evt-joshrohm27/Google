/**
 * ReportError component tests.
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
import {
	createTestRegistry,
	provideModuleRegistrations,
	provideModules,
	provideUserInfo,
	unsubscribeFromAll,
} from '../../../tests/js/utils';
import {
	ERROR_CODE_MISSING_REQUIRED_SCOPE,
	ERROR_REASON_INSUFFICIENT_PERMISSIONS,
} from '../util/errors';
import { fireEvent, render } from '../../../tests/js/test-utils';
import ReportError from './ReportError';
import { MODULES_ANALYTICS } from '../modules/analytics/datastore/constants';
import { VIEW_CONTEXT_MAIN_DASHBOARD_VIEW_ONLY } from '../googlesitekit/constants';

describe( 'ReportError', () => {
	let registry;
	let invalidateResolutionSpy;
	const moduleName = 'test-module';

	const errors = [
		{
			code: 'test-error-code',
			message: 'Test error message one',
			data: {
				reason: 'Data Error',
			},
			selectorData: {
				args: [
					{
						dimensions: [ 'ga:date' ],
						metrics: [ { expression: 'ga:users' } ],
						startDate: '2020-08-11',
						endDate: '2020-09-07',
					},
				],
				name: 'getReport',
				storeName: MODULES_ANALYTICS,
			},
		},
		{
			code: 'test-error-code',
			message: 'Test error message two',
			data: {
				reason: 'Data Error',
			},
			selectorData: {
				args: [
					{
						dimensions: [ 'ga:date' ],
						metrics: [ { expression: 'ga:users' } ],
						startDate: '2020-08-11',
						endDate: '2020-09-07',
					},
				],
				name: 'getReport',
				storeName: MODULES_ANALYTICS,
			},
		},
	];

	beforeEach( () => {
		registry = createTestRegistry();
		provideModules( registry, [
			{ slug: moduleName, name: 'Test Module' },
		] );
		invalidateResolutionSpy = jest.spyOn(
			registry.dispatch( MODULES_ANALYTICS ),
			'invalidateResolution'
		);
	} );

	afterEach( () => {
		invalidateResolutionSpy.mockReset();
		unsubscribeFromAll( registry );
	} );

	it( 'renders the error message', () => {
		const { container } = render(
			<ReportError
				moduleSlug={ moduleName }
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {},
				} }
			/>,
			{
				registry,
			}
		);

		expect( container.querySelector( 'p' ).textContent ).toEqual(
			'Test error message'
		);
	} );

	it( 'renders the error message without HTML tags', () => {
		const { container } = render(
			<ReportError
				moduleSlug={ moduleName }
				error={ {
					code: 'test-error-code',
					message:
						'<h1>Test error message <b>with</b> HTML tags</h1>',
					data: {},
				} }
			/>,
			{
				registry,
			}
		);

		expect( container.querySelector( 'p' ).textContent ).toEqual(
			'Test error message with HTML tags'
		);
	} );

	it( 'renders the insufficient permission error when ERROR_REASON_INSUFFICIENT_PERMISSIONS is provided as reason', () => {
		const { container } = render(
			<ReportError
				moduleSlug={ moduleName }
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( container.querySelector( 'h3' ).textContent ).toEqual(
			'Insufficient permissions in Test Module'
		);
	} );

	it( 'renders the insufficient permission error along with the `Request access` button if it exists for a module', () => {
		const userData = {
			id: 1,
			email: 'admin@example.com',
			name: 'admin',
			picture: 'https://path/to/image',
		};
		provideModules( registry, [
			{
				active: true,
				connected: true,
				slug: 'analytics',
			},
		] );
		provideModuleRegistrations( registry );
		provideUserInfo( registry, userData );

		const [ accountID, internalWebPropertyID, profileID ] = [
			'12345',
			'34567',
			'56789',
		];

		registry.dispatch( MODULES_ANALYTICS ).setAccountID( accountID );
		registry
			.dispatch( MODULES_ANALYTICS )
			.setInternalWebPropertyID( internalWebPropertyID );
		registry.dispatch( MODULES_ANALYTICS ).setProfileID( profileID );

		const { container, queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( container.querySelector( 'h3' ).textContent ).toEqual(
			'Insufficient permissions in Analytics'
		);
		// Verify the `Request access` button is rendered.
		expect( queryByText( /request access/i ) ).toBeInTheDocument();
	} );

	it( 'renders the help link with the moduleSlug_insufficient_permissions string when ERROR_REASON_INSUFFICIENT_PERMISSIONS is provided as reason', () => {
		const { container } = render(
			<ReportError
				moduleSlug={ moduleName }
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( container.querySelector( 'a' ) ).toHaveAttribute(
			'href',
			expect.stringContaining(
				`error_id=${ moduleName }_insufficient_permissions`
			)
		);
	} );

	it( 'renders alternate error for non-authenticated users when ERROR_REASON_INSUFFICIENT_PERMISSIONS is provided as reason', () => {
		const { container } = render(
			<ReportError
				moduleSlug={ moduleName }
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
				} }
			/>,
			{
				registry,
				viewContext: VIEW_CONTEXT_MAIN_DASHBOARD_VIEW_ONLY,
			}
		);

		expect( container.querySelector( 'h3' ).textContent ).toEqual(
			'Access lost to Test Module'
		);
	} );

	it( 'should not render the `Request access` button for an insufficient permission error when the user is not authenticated', () => {
		const userData = {
			id: 1,
			email: 'admin@example.com',
			name: 'admin',
			picture: 'https://path/to/image',
		};
		provideModules( registry, [
			{
				active: true,
				connected: true,
				slug: 'analytics',
			},
		] );
		provideModuleRegistrations( registry );
		provideUserInfo( registry, userData );

		const [ accountID, internalWebPropertyID, profileID ] = [
			'12345',
			'34567',
			'56789',
		];

		registry.dispatch( MODULES_ANALYTICS ).setAccountID( accountID );
		registry
			.dispatch( MODULES_ANALYTICS )
			.setInternalWebPropertyID( internalWebPropertyID );
		registry.dispatch( MODULES_ANALYTICS ).setProfileID( profileID );

		const { queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
				} }
			/>,
			{
				registry,
				viewContext: VIEW_CONTEXT_MAIN_DASHBOARD_VIEW_ONLY,
			}
		);

		// Verify the `Request access` button is not rendered.
		expect( queryByText( /request access/i ) ).not.toBeInTheDocument();
	} );

	it( "should not render the `Retry` button if the error's `selectorData.name` is not `getReport`", () => {
		const { queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
					selectorData: {
						args: [],
						name: 'getAccountID',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( queryByText( /retry/i ) ).not.toBeInTheDocument();
	} );

	it( 'should not render the `Retry` button if the error reason is `ERROR_REASON_INSUFFICIENT_PERMISSIONS`', () => {
		const { queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: ERROR_REASON_INSUFFICIENT_PERMISSIONS,
					},
					selectorData: {
						args: [],
						name: 'getAccountID',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( queryByText( /retry/i ) ).not.toBeInTheDocument();
	} );

	it( 'should not render the `Retry` button if the error reason is `ERROR_CODE_MISSING_REQUIRED_SCOPE`', () => {
		const { queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: ERROR_CODE_MISSING_REQUIRED_SCOPE,
					message: 'Test error message',
					data: {
						reason: '',
					},
					selectorData: {
						args: [],
						name: 'getAccountID',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( queryByText( /retry/i ) ).not.toBeInTheDocument();
	} );

	it( 'should not render the `Retry` button if the error is an auth error', () => {
		const { queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: '',
						reconnectURL: 'example.com',
					},
					selectorData: {
						args: [],
						name: 'getAccountID',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( queryByText( /retry/i ) ).not.toBeInTheDocument();
	} );

	it( 'should render the `Retry` button if the error selector name is `getReport`', () => {
		const { getByRole } = render(
			<ReportError
				moduleSlug="analytics"
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: '',
					},
					selectorData: {
						args: [
							{
								dimensions: [ 'ga:date' ],
								metrics: [ { expression: 'ga:users' } ],
								startDate: '2020-08-11',
								endDate: '2020-09-07',
							},
						],
						name: 'getReport',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( getByRole( 'button', { name: /retry/i } ) ).toBeInTheDocument();
	} );

	it( 'should dispatch the `invalidateResolution` action for each retry-able error', () => {
		const { getByRole } = render(
			<ReportError
				moduleSlug="analytics"
				error={ [
					...errors,
					// The following error object is not retry-able.
					...[
						{
							code: ERROR_CODE_MISSING_REQUIRED_SCOPE,
							message: 'Test error message',
							data: {
								reason: '',
							},
							selectorData: {
								args: [],
								name: 'getAccountID',
								storeName: MODULES_ANALYTICS,
							},
						},
					],
				] }
			/>,
			{
				registry,
			}
		);

		expect( getByRole( 'button', { name: /retry/i } ) ).toBeInTheDocument();

		fireEvent.click( getByRole( 'button', { name: /retry/i } ) );

		// There are three error object is being passed to the prop.
		// Only two are retry-able.
		// So, there should be only two invalidateResolution calls.
		expect( invalidateResolutionSpy ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'should list all the error descriptions one by one if errors are different', () => {
		const { queryByText, getByRole } = render(
			<ReportError moduleSlug="analytics" error={ errors } />,
			{
				registry,
			}
		);

		expect( getByRole( 'button', { name: /retry/i } ) ).toBeInTheDocument();

		// Verify that the error descriptions are listed one by one if the errors are different.
		expect( queryByText( /Test error message one/i ) ).toBeInTheDocument();
		expect( queryByText( /Test error message two/i ) ).toBeInTheDocument();

		fireEvent.click( getByRole( 'button', { name: /retry/i } ) );

		expect( invalidateResolutionSpy ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'should list only the unique error descriptions', () => {
		const { container, queryByText, getByRole } = render(
			<ReportError
				moduleSlug="analytics"
				error={ [ ...errors, ...errors ] }
			/>,
			{
				registry,
			}
		);

		expect( getByRole( 'button', { name: /retry/i } ) ).toBeInTheDocument();

		// Verify that the error descriptions are listed one by one if the errors are different.
		expect( queryByText( /Test error message one/i ) ).toBeInTheDocument();
		expect( queryByText( /Test error message two/i ) ).toBeInTheDocument();

		const errorDescriptionElement = container.querySelectorAll(
			'.googlesitekit-cta__description'
		);

		// Verify the child element count for the error description element is two.
		// However, the passed error array has four repetitive error objects.
		expect( errorDescriptionElement[ 0 ].childElementCount ).toBe( 2 );

		fireEvent.click( getByRole( 'button', { name: /retry/i } ) );
		expect( invalidateResolutionSpy ).toHaveBeenCalledTimes( 4 );
	} );

	it( 'should render `Get help` link without prefix text on non-retryable error', () => {
		const { getByRole, queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				// Non-Retryable Error
				error={ {
					code: ERROR_CODE_MISSING_REQUIRED_SCOPE,
					message: 'Test error message',
					data: {
						reason: '',
					},
					selectorData: {
						args: [],
						name: 'getAccountID',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect(
			getByRole( 'link', { name: /get help/i } )
		).toBeInTheDocument();
		expect( queryByText( /retry didn’t work/i ) ).not.toBeInTheDocument();
	} );

	it( 'should render `Get help` link with prefix text on retryable error', () => {
		const { getByRole, queryByText } = render(
			<ReportError
				moduleSlug="analytics"
				// Retryable Error
				error={ {
					code: 'test-error-code',
					message: 'Test error message',
					data: {
						reason: '',
					},
					selectorData: {
						args: [
							{
								dimensions: [ 'ga:date' ],
								metrics: [ { expression: 'ga:users' } ],
								startDate: '2020-08-11',
								endDate: '2020-09-07',
							},
						],
						name: 'getReport',
						storeName: MODULES_ANALYTICS,
					},
				} }
			/>,
			{
				registry,
			}
		);

		expect( getByRole( 'button', { name: /retry/i } ) ).toBeInTheDocument();
		expect(
			getByRole( 'link', { name: /get help/i } )
		).toBeInTheDocument();
		expect( queryByText( /retry didn’t work/i ) ).toBeInTheDocument();
	} );
} );
