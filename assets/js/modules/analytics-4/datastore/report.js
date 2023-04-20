/**
 * `modules/analytics-4` data store: report.
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

/**
 * External dependencies
 */
import invariant from 'invariant';
import { isPlainObject } from 'lodash';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import Data from 'googlesitekit-data';
import { createFetchStore } from '../../../googlesitekit/data/create-fetch-store';
import { CORE_USER } from '../../../googlesitekit/datastore/user/constants';
import { CORE_SITE } from '../../../googlesitekit/datastore/site/constants';
import { DATE_RANGE_OFFSET, MODULES_ANALYTICS_4 } from './constants';
import { DAY_IN_SECONDS, stringifyObject } from '../../../util';
import { isValidDateRange } from '../../../util/report-validation';
import {
	normalizeReportOptions,
	isValidDimensionFilters,
	isValidDimensions,
	isValidMetrics,
	isValidOrders,
	isZeroReport,
} from '../utils';
import { createGatheringDataStore } from '../../../googlesitekit/modules/create-gathering-data-store';
const { createRegistrySelector } = Data;

const fetchGetReportStore = createFetchStore( {
	baseName: 'getReport',
	controlCallback: ( { options } ) => {
		return API.get(
			'modules',
			'analytics-4',
			'report',
			normalizeReportOptions( options )
		);
	},
	reducerCallback: ( state, report, { options } ) => {
		return {
			...state,
			reports: {
				...state.reports,
				[ stringifyObject( options ) ]: report,
			},
		};
	},
	argsToParams: ( options ) => {
		return { options };
	},
	validateParams: ( { options } = {} ) => {
		invariant(
			isPlainObject( options ),
			'options for Analytics 4 report must be an object.'
		);
		invariant(
			isValidDateRange( options ),
			'Either date range or start/end dates must be provided for Analytics 4 report.'
		);

		const { metrics, dimensions, dimensionFilters, orderby } =
			normalizeReportOptions( options );

		invariant(
			metrics.length,
			'Requests must specify at least one metric for an Analytics 4 report.'
		);
		invariant(
			isValidMetrics( metrics ),
			'metrics for an Analytics 4 report must be either a string, an array of strings, an object, an array of objects, or a mix of strings and objects. Objects must have a "name" property. Metric names must match the expression ^[a-zA-Z0-9_]+$.'
		);

		if ( dimensions ) {
			invariant(
				isValidDimensions( dimensions ),
				'dimensions for an Analytics 4 report must be either a string, an array of strings, an object, an array of objects, or a mix of strings and objects. Objects must have a "name" property.'
			);
		}

		if ( dimensionFilters ) {
			invariant(
				isValidDimensionFilters( dimensionFilters ),
				'dimensionFilters for an Analytics 4 report must be a map of dimension names as keys and dimension values as values.'
			);
		}

		if ( orderby ) {
			invariant(
				isValidOrders( orderby ),
				'orderby for an Analytics 4 report must be an array of OrderBy objects where each object should have either a "metric" or "dimension" property, and an optional "desc" property.'
			);
		}
	},
} );

const gatheringDataStore = createGatheringDataStore( 'analytics-4', {
	storeName: MODULES_ANALYTICS_4,
	dataAvailable:
		global._googlesitekitModulesData?.[ 'data_available_analytics-4' ],
	selectDataAvailability: createRegistrySelector( ( select ) => () => {
		const hasZeroData = select( MODULES_ANALYTICS_4 ).hasZeroData();

		if ( hasZeroData === undefined ) {
			return undefined;
		}
		if ( hasZeroData === false ) {
			return true;
		}

		const propertyID = select( MODULES_ANALYTICS_4 ).getPropertyID();

		if ( propertyID === undefined ) {
			return undefined;
		}

		const property =
			select( MODULES_ANALYTICS_4 ).getProperty( propertyID );

		if ( property === undefined ) {
			return undefined;
		}

		const createTime = new Date( property.createTime ).getTime();

		// If the property was created within the last three days and has no data, assume it's still gathering data.
		if ( createTime > Date.now() - DAY_IN_SECONDS * 3 * 1000 ) {
			return false;
		}

		return true;
	} ),
} );

const baseInitialState = {
	reports: {},
};

const baseResolvers = {
	*getReport( options = {} ) {
		const registry = yield Data.commonActions.getRegistry();
		const existingReport = registry
			.select( MODULES_ANALYTICS_4 )
			.getReport( options );

		// If there is already a report loaded in state, consider it fulfilled
		// and don't make an API request.
		if ( existingReport ) {
			return;
		}

		yield fetchGetReportStore.actions.fetchGetReport( options );
	},
};

const baseSelectors = {
	/**
	 * Gets an Analytics report for the given options.
	 *
	 * @since 1.94.0
	 *
	 * @param {Object}         state                      Data store's state.
	 * @param {Object}         options                    Options for generating the report.
	 * @param {string}         options.startDate          Required, unless dateRange is provided. Start date to query report data for as YYYY-mm-dd.
	 * @param {string}         options.endDate            Required, unless dateRange is provided. End date to query report data for as YYYY-mm-dd.
	 * @param {Array.<string>} options.metrics            Required. List of metrics to query.
	 * @param {string}         [options.compareStartDate] Optional. Start date to compare report data for as YYYY-mm-dd.
	 * @param {string}         [options.compareEndDate]   Optional. End date to compare report data for as YYYY-mm-dd.
	 * @param {Array.<string>} [options.dimensions]       Optional. List of dimensions to group results by. Default an empty array.
	 * @param {Object}         [options.dimensionFilters] Optional. Map of dimension filters for filtering options on a dimension. Default an empty object.
	 * @param {Array.<Object>} [options.orderby]          Optional. An order definition object, or a list of order definition objects, each one containing 'fieldName' and 'sortOrder'. 'sortOrder' must be either 'ASCENDING' or 'DESCENDING'. Default empty array.
	 * @param {string}         [options.url]              Optional. URL to get a report for only this URL. Default an empty string.
	 * @param {number}         [options.limit]            Optional. Maximum number of entries to return. Default 1000.
	 * @return {(Array.<Object>|undefined)} An Analytics report; `undefined` if not loaded.
	 */
	getReport( state, options ) {
		const { reports } = state;

		return reports[ stringifyObject( options ) ];
	},

	/**
	 * Gets a Page title to URL map for the given options.
	 *
	 * @since 1.96.0
	 *
	 * @param {Object} state             Data store's state.
	 * @param {Object} report            A report from the getReport selector containing pagePaths.
	 * @param {Object} options           Options for generating the report.
	 * @param {string} options.startDate Required, start date to query report data for as YYYY-mm-dd.
	 * @param {string} options.endDate   Required, end date to query report data for as YYYY-mm-dd.
	 * @return {(Object|undefined)} A map with url as the key and page title as the value. `undefined` if not loaded.
	 */
	getPageTitles: createRegistrySelector(
		( select ) =>
			( state, report, { startDate, endDate } = {} ) => {
				if ( ! isPlainObject( report ) ) {
					return;
				}

				const pagePaths = [];
				const REQUEST_MULTIPLIER = 5;

				/*
				 * Iterate over the report rows, finding the dimension containing the
				 * pagePath value which we add to the array of pagePaths.
				 */
				const { dimensionHeaders, rows } = report;
				if (
					Array.isArray( dimensionHeaders ) &&
					Array.isArray( rows )
				) {
					const pagePathIndex = dimensionHeaders.findIndex(
						( { name } ) => name === 'pagePath'
					);
					rows.forEach( ( { dimensionValues } ) => {
						if (
							! pagePaths.includes(
								dimensionValues[ pagePathIndex ].value
							)
						) {
							pagePaths.push(
								dimensionValues[ pagePathIndex ].value
							);
						}
					} );
				}

				const urlTitleMap = {};
				if ( ! pagePaths.length ) {
					return urlTitleMap;
				}

				const options = {
					startDate,
					endDate,
					dimensions: [ 'pagePath', 'pageTitle' ],
					dimensionFilters: { pagePath: pagePaths.sort() },
					metrics: [ { name: 'screenPageViews' } ],
					orderby: [
						{
							metric: { metricName: 'screenPageViews' },
							desc: true,
						},
					],
					limit: REQUEST_MULTIPLIER * pagePaths.length,
				};

				const pageTitlesReport =
					select( MODULES_ANALYTICS_4 ).getReport( options );
				if ( undefined === pageTitlesReport ) {
					return;
				}

				( pageTitlesReport?.rows || [] ).forEach(
					( { dimensionValues } ) => {
						if ( ! urlTitleMap[ dimensionValues[ 0 ].value ] ) {
							// key is the url, value is the page title.
							urlTitleMap[ dimensionValues[ 0 ].value ] =
								dimensionValues[ 1 ].value;
						}
					}
				);

				pagePaths.forEach( ( pagePath ) => {
					if ( ! urlTitleMap[ pagePath ] ) {
						// If we don't have a title for the pagePath, we use '(unknown)'.
						urlTitleMap[ pagePath ] = __(
							'(unknown)',
							'google-site-kit'
						);
					}
				} );

				return urlTitleMap;
			}
	),

	/**
	 * Determines whether Analytics 4 has zero data or not.
	 *
	 * @since 1.95.0
	 *
	 * @return {boolean|undefined} Returns `true` if the report is zero, otherwise `false`. Returns `undefined` while resolving.
	 */
	hasZeroData: createRegistrySelector( ( select ) => () => {
		const { startDate, endDate } = select( CORE_USER ).getDateRangeDates( {
			offsetDays: DATE_RANGE_OFFSET,
		} );

		const args = {
			dimensions: [ 'date' ],
			metrics: [ { name: 'totalUsers' } ],
			startDate,
			endDate,
		};

		const url = select( CORE_SITE ).getCurrentEntityURL();
		if ( url ) {
			args.url = url;
		}

		// Disable reason: select needs to be called here or it will never run.
		// eslint-disable-next-line @wordpress/no-unused-vars-before-return
		const report = select( MODULES_ANALYTICS_4 ).getReport( args );
		const hasResolvedReport = select(
			MODULES_ANALYTICS_4
		).hasFinishedResolution( 'getReport', [ args ] );

		if ( ! hasResolvedReport ) {
			return undefined;
		}

		const hasReportError = select(
			MODULES_ANALYTICS_4
		).getErrorForSelector( 'getReport', [ args ] );

		// If there is an error, return false, to be aligned with the behaviour of the UA isGatheringData selector,
		// but with a more explicit check, i.e. checking for a report error rather than a non-successful response shape.
		// TODO: In future we should consider changing this selector so it returns a distinct value for errors, or throws an error.
		if ( hasReportError ) {
			return false;
		}

		return isZeroReport( report );
	} ),
};

const store = Data.combineStores( fetchGetReportStore, gatheringDataStore, {
	initialState: baseInitialState,
	resolvers: baseResolvers,
	selectors: baseSelectors,
} );

export const initialState = store.initialState;
export const actions = store.actions;
export const controls = store.controls;
export const reducer = store.reducer;
export const resolvers = store.resolvers;
export const selectors = store.selectors;

export default store;
