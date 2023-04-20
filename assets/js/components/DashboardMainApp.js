/**
 * DashboardMainApp component.
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
import { Fragment, useState } from '@wordpress/element';
import { useMount } from 'react-use';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import {
	CONTEXT_MAIN_DASHBOARD_KEY_METRICS,
	CONTEXT_MAIN_DASHBOARD_TRAFFIC,
	CONTEXT_MAIN_DASHBOARD_CONTENT,
	CONTEXT_MAIN_DASHBOARD_SPEED,
	CONTEXT_MAIN_DASHBOARD_MONETIZATION,
} from '../googlesitekit/widgets/default-contexts';
import { DAY_IN_SECONDS } from '../util';
import Header from './Header';
import DashboardSharingSettingsButton from './dashboard-sharing/DashboardSharingSettingsButton';
import WidgetContextRenderer from '../googlesitekit/widgets/components/WidgetContextRenderer';
import EntitySearchInput from './EntitySearchInput';
import DateRangeSelector from './DateRangeSelector';
import HelpMenu from './help/HelpMenu';
import BannerNotifications from './notifications/BannerNotifications';
import SurveyViewTrigger from './surveys/SurveyViewTrigger';
import CurrentSurveyPortal from './surveys/CurrentSurveyPortal';
import ScrollEffect from './ScrollEffect';
import {
	ANCHOR_ID_CONTENT,
	ANCHOR_ID_KEY_METRICS,
	ANCHOR_ID_MONETIZATION,
	ANCHOR_ID_SPEED,
	ANCHOR_ID_TRAFFIC,
} from '../googlesitekit/constants';
import { CORE_USER } from '../googlesitekit/datastore/user/constants';
import { CORE_WIDGETS } from '../googlesitekit/widgets/datastore/constants';
import { useFeature } from '../hooks/useFeature';
import useViewOnly from '../hooks/useViewOnly';
const { useSelect } = Data;

export default function DashboardMainApp() {
	const [ showSurveyPortal, setShowSurveyPortal ] = useState( false );

	const dashboardSharingEnabled = useFeature( 'dashboardSharing' );
	const userInputEnabled = useFeature( 'userInput' );
	const viewOnlyDashboard = useViewOnly();

	useMount( () => {
		// Render the current survey portal in 5 seconds after the initial rendering.
		setTimeout( () => setShowSurveyPortal( true ), 5000 );
	} );

	const viewableModules = useSelect( ( select ) => {
		if ( ! viewOnlyDashboard ) {
			return null;
		}

		return select( CORE_USER ).getViewableModules();
	} );

	const widgetContextOptions = {
		modules: viewableModules ? viewableModules : undefined,
	};

	const isKeyMetricsActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_MAIN_DASHBOARD_KEY_METRICS,
			widgetContextOptions
		)
	);

	const isTrafficActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_MAIN_DASHBOARD_TRAFFIC,
			widgetContextOptions
		)
	);

	const isContentActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_MAIN_DASHBOARD_CONTENT,
			widgetContextOptions
		)
	);

	const isSpeedActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_MAIN_DASHBOARD_SPEED,
			widgetContextOptions
		)
	);

	const isMonetizationActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_MAIN_DASHBOARD_MONETIZATION,
			widgetContextOptions
		)
	);

	let lastWidgetAnchor = null;

	if ( isMonetizationActive ) {
		lastWidgetAnchor = ANCHOR_ID_MONETIZATION;
	} else if ( isSpeedActive ) {
		lastWidgetAnchor = ANCHOR_ID_SPEED;
	} else if ( isContentActive ) {
		lastWidgetAnchor = ANCHOR_ID_CONTENT;
	} else if ( isTrafficActive ) {
		lastWidgetAnchor = ANCHOR_ID_TRAFFIC;
	} else if ( isKeyMetricsActive ) {
		lastWidgetAnchor = ANCHOR_ID_KEY_METRICS;
	}

	return (
		<Fragment>
			<ScrollEffect />

			<Header subHeader={ <BannerNotifications /> } showNavigation>
				<EntitySearchInput />
				<DateRangeSelector />
				{ dashboardSharingEnabled && ! viewOnlyDashboard && (
					<DashboardSharingSettingsButton />
				) }
				<HelpMenu />
			</Header>
			{ /*
				This isn't *strictly* required, but provides a safety net against
				accidentally rendering the widget area if any child widgets accidentally
				render when `userInputEnabled` is false.

				This check can be removed once the User Input feature is fully launched
				and we remove this feature flag.

				See: https://github.com/google/site-kit-wp/pull/6630#discussion_r1127229162
			*/ }
			{ userInputEnabled && (
				<WidgetContextRenderer
					id={ ANCHOR_ID_KEY_METRICS }
					slug={ CONTEXT_MAIN_DASHBOARD_KEY_METRICS }
					className={ classnames( {
						'googlesitekit-widget-context--last':
							lastWidgetAnchor === ANCHOR_ID_KEY_METRICS,
					} ) }
				/>
			) }
			<WidgetContextRenderer
				id={ ANCHOR_ID_TRAFFIC }
				slug={ CONTEXT_MAIN_DASHBOARD_TRAFFIC }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_TRAFFIC,
				} ) }
			/>
			<WidgetContextRenderer
				id={ ANCHOR_ID_CONTENT }
				slug={ CONTEXT_MAIN_DASHBOARD_CONTENT }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_CONTENT,
				} ) }
			/>
			<WidgetContextRenderer
				id={ ANCHOR_ID_SPEED }
				slug={ CONTEXT_MAIN_DASHBOARD_SPEED }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_SPEED,
				} ) }
			/>
			<WidgetContextRenderer
				id={ ANCHOR_ID_MONETIZATION }
				slug={ CONTEXT_MAIN_DASHBOARD_MONETIZATION }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_MONETIZATION,
				} ) }
			/>

			<SurveyViewTrigger
				triggerID="view_dashboard"
				ttl={ DAY_IN_SECONDS }
			/>

			{ showSurveyPortal && <CurrentSurveyPortal /> }
		</Fragment>
	);
}
