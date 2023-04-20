/**
 * WPDashboardWidgets component.
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
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Fragment } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { CORE_MODULES } from '../../googlesitekit/modules/datastore/constants';
import { MODULES_ANALYTICS } from '../../modules/analytics/datastore/constants';
import { withWidgetComponentProps } from '../../googlesitekit/widgets/util/get-widget-component-props';
import WPDashboardImpressions from './WPDashboardImpressions';
import WPDashboardClicks from './WPDashboardClicks';
import WPDashboardUniqueVisitors from './WPDashboardUniqueVisitors';
import WPDashboardUniqueVisitorsGA4 from './WPDashboardUniqueVisitorsGA4';
import WPDashboardSessionDuration from './WPDashboardSessionDuration';
import WPDashboardSessionDurationGA4 from './WPDashboardSessionDurationGA4';
import WPDashboardPopularPages from './WPDashboardPopularPages';
import WPDashboardPopularPagesGA4 from './WPDashboardPopularPagesGA4';
import WPDashboardUniqueVisitorsChart from './WPDashboardUniqueVisitorsChart';
import WPDashboardUniqueVisitorsChartGA4 from './WPDashboardUniqueVisitorsChartGA4';
import WPDashboardActivateAnalyticsCTA from './WPDashboardActivateAnalyticsCTA';
const { useSelect } = Data;

// Widget slugs.
const WIDGET_IMPRESSIONS = 'wpDashboardImpressions';
const WIDGET_CLICKS = 'wpDashboardClicks';
const WIDGET_VISITORS = 'wpDashboardUniqueVisitors';
const WIDGET_VISITORS_CHART = 'wpDashboardUniqueVisitorsChart';
const WIDGET_SESSION_DURATION = 'wpDashboardSessionDuration';
const WIDGET_POPULAR_PAGES = 'wpDashboardPopularPages';

// Search Console widgets.
const WPDashboardImpressionsWidget = withWidgetComponentProps(
	WIDGET_IMPRESSIONS
)( WPDashboardImpressions );
const WPDashboardClicksWidget =
	withWidgetComponentProps( WIDGET_CLICKS )( WPDashboardClicks );

// Analytics Widgets.
const WPDashboardUniqueVisitorsWidget = withWidgetComponentProps(
	WIDGET_VISITORS
)( WPDashboardUniqueVisitors );
const WPDashboardSessionDurationWidget = withWidgetComponentProps(
	WIDGET_SESSION_DURATION
)( WPDashboardSessionDuration );
const WPDashboardPopularPagesWidget = withWidgetComponentProps(
	WIDGET_POPULAR_PAGES
)( WPDashboardPopularPages );
const WPDashboardUniqueVisitorsChartWidget = withWidgetComponentProps(
	WIDGET_VISITORS_CHART
)( WPDashboardUniqueVisitorsChart );

// Analytics 4 Widgets.
const WPDashboardUniqueVisitorsGA4Widget = withWidgetComponentProps(
	WIDGET_VISITORS
)( WPDashboardUniqueVisitorsGA4 );
const WPDashboardSessionDurationGA4Widget = withWidgetComponentProps(
	WIDGET_SESSION_DURATION
)( WPDashboardSessionDurationGA4 );
const WPDashboardPopularPagesGA4Widget = withWidgetComponentProps(
	WIDGET_POPULAR_PAGES
)( WPDashboardPopularPagesGA4 );
const WPDashboardUniqueVisitorsChartGA4Widget = withWidgetComponentProps(
	WIDGET_VISITORS_CHART
)( WPDashboardUniqueVisitorsChartGA4 );

export default function WPDashboardWidgets() {
	const isGA4DashboardView = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).isGA4DashboardView()
	);
	const analyticsModule = useSelect( ( select ) =>
		select( CORE_MODULES ).getModule( 'analytics' )
	);

	if ( analyticsModule === undefined ) {
		return null;
	}

	const {
		active: analyticsModuleActive,
		connected: analyticsModuleConnected,
	} = analyticsModule;

	const analyticsModuleActiveAndConnected =
		analyticsModuleActive && analyticsModuleConnected;

	return (
		<div
			className={ classnames(
				'googlesitekit-wp-dashboard-stats googlesitekit-wp-dashboard-stats--twoup',
				{
					'googlesitekit-wp-dashboard-stats--fourup':
						analyticsModuleActiveAndConnected,
				}
			) }
		>
			{ analyticsModuleActiveAndConnected && ! isGA4DashboardView && (
				<Fragment>
					<WPDashboardUniqueVisitorsWidget />
					<WPDashboardSessionDurationWidget />
				</Fragment>
			) }

			{ isGA4DashboardView && (
				<Fragment>
					<WPDashboardUniqueVisitorsGA4Widget />
					<WPDashboardSessionDurationGA4Widget />
				</Fragment>
			) }

			<WPDashboardImpressionsWidget />
			<WPDashboardClicksWidget />

			{ ! analyticsModuleActiveAndConnected && (
				<div className="googlesitekit-wp-dashboard-stats__cta">
					<WPDashboardActivateAnalyticsCTA />
				</div>
			) }

			{ analyticsModuleActiveAndConnected && ! isGA4DashboardView && (
				<Fragment>
					<WPDashboardUniqueVisitorsChartWidget />
					<WPDashboardPopularPagesWidget />
				</Fragment>
			) }

			{ isGA4DashboardView && (
				<Fragment>
					<WPDashboardUniqueVisitorsChartGA4Widget />
					<WPDashboardPopularPagesGA4Widget />
				</Fragment>
			) }
		</div>
	);
}
