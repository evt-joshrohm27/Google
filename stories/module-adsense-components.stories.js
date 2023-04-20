/**
 * AdSense Module Component Stories.
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
	generateReportBasedWidgetStories,
	makeReportDataGenerator,
} from './utils/generate-widget-stories';
import { zeroing } from './utils/adsense-data-zeroing';
import DashboardTopEarningPagesWidget from '../assets/js/modules/adsense/components/dashboard/DashboardTopEarningPagesWidget';
import ModuleOverviewWidget from '../assets/js/modules/adsense/components/module/ModuleOverviewWidget';
import { MODULES_ADSENSE } from '../assets/js/modules/adsense/datastore/constants';
import { MODULES_ANALYTICS } from '../assets/js/modules/analytics/datastore/constants';
import {
	getAdSenseMockResponse,
	provideAdSenseMockReport,
} from '../assets/js/modules/adsense/util/data-mock';
import { getAnalyticsMockResponse } from '../assets/js/modules/analytics/util/data-mock';

const generateAnalyticsData = makeReportDataGenerator(
	getAnalyticsMockResponse
);
const generateAdSenseData = makeReportDataGenerator( getAdSenseMockResponse );

const topEarningPagesArgs = {
	startDate: '2020-08-15',
	endDate: '2020-09-11',
	dimensions: [ 'ga:pageTitle', 'ga:pagePath' ],
	metrics: [
		{ expression: 'ga:adsenseRevenue', alias: 'Earnings' },
		{ expression: 'ga:adsenseECPM', alias: 'Page RPM' },
		{ expression: 'ga:adsensePageImpressions', alias: 'Impressions' },
	],
	orderby: {
		fieldName: 'ga:adsenseRevenue',
		sortOrder: 'DESCENDING',
	},
	limit: 5,
};

// These components make a simple AdSense report query to determine the
// currency that should be displayed in the report table.
const getCurrencyFromReportOptions = {
	startDate: '2020-08-15',
	endDate: '2020-09-11',
	metrics: 'ESTIMATED_EARNINGS',
};

generateReportBasedWidgetStories( {
	moduleSlugs: [ 'adsense', 'analytics' ],
	datastore: MODULES_ANALYTICS,
	group: 'AdSense Module/Components/Dashboard/Top Earning Pages Widget',
	referenceDate: '2020-09-12',
	...generateAnalyticsData( { ...topEarningPagesArgs } ),
	options: topEarningPagesArgs,
	setup: ( registry, variantName ) => {
		registry
			.dispatch( MODULES_ANALYTICS )
			.setAdsenseLinked( variantName !== 'AdSense Not Linked' );
		registry
			.dispatch( MODULES_ADSENSE )
			.receiveIsAdBlockerActive( variantName === 'Ad Blocker Active' );
		provideAdSenseMockReport( registry, getCurrencyFromReportOptions );
		registry
			.dispatch( MODULES_ADSENSE )
			.finishResolution( 'getReport', [ getCurrencyFromReportOptions ] );
	},
	Component: DashboardTopEarningPagesWidget,
	wrapWidget: false,
	additionalVariants: {
		'AdSense Not Linked': {
			data: [],
			options: topEarningPagesArgs,
		},
		'Ad Blocker Active': {
			data: [],
			options: [],
		},
	},
} );

generateReportBasedWidgetStories( {
	moduleSlugs: [ 'adsense' ],
	datastore: MODULES_ADSENSE,
	group: 'AdSense Module/Components/Module/Overview Widget',
	referenceDate: '2020-11-25',
	defaultVariantOptions: {
		ZeroData: {
			features: [ 'adsenseSetupV2' ],
		},
	},
	zeroing,
	...generateAdSenseData( [
		{
			metrics: [
				'ESTIMATED_EARNINGS',
				'PAGE_VIEWS_RPM',
				'IMPRESSIONS',
				'PAGE_VIEWS_CTR',
			],
			startDate: '2020-10-29',
			endDate: '2020-11-25',
		},
		{
			dimensions: [ 'DATE' ],
			metrics: [
				'ESTIMATED_EARNINGS',
				'PAGE_VIEWS_RPM',
				'IMPRESSIONS',
				'PAGE_VIEWS_CTR',
			],
			startDate: '2020-10-29',
			endDate: '2020-11-25',
		},
		{
			metrics: [
				'ESTIMATED_EARNINGS',
				'PAGE_VIEWS_RPM',
				'IMPRESSIONS',
				'PAGE_VIEWS_CTR',
			],
			startDate: '2020-10-01',
			endDate: '2020-10-28',
		},
		{
			dimensions: [ 'DATE' ],
			metrics: [
				'ESTIMATED_EARNINGS',
				'PAGE_VIEWS_RPM',
				'IMPRESSIONS',
				'PAGE_VIEWS_CTR',
			],
			startDate: '2020-10-01',
			endDate: '2020-10-28',
		},
	] ),
	Component: ModuleOverviewWidget,
	wrapWidget: false,
} );
