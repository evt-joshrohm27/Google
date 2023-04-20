/**
 * WP Dashboard Unique Visitors GA4 Component Stories.
 *
 * Site Kit by Google, Copyright 202 Google LLC
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
import { withWidgetComponentProps } from '../../googlesitekit/widgets/util';
import {
	setupAnalytics4GatheringData,
	setupAnalytics4MockReports,
	setupAnalytics4ZeroData,
	setupAnalytics4Loading,
	setupAnalytics4Error,
} from './common-GA4.stories';
import { setupSearchConsoleZeroData, widgetDecorators } from './common.stories';
import WithRegistrySetup from '../../../../tests/js/WithRegistrySetup';
import WPDashboardUniqueVisitorsGA4 from './WPDashboardUniqueVisitorsGA4';

const WidgetWithComponentProps = withWidgetComponentProps( 'widget-slug' )(
	WPDashboardUniqueVisitorsGA4
);

const Template = ( { setupRegistry = () => {}, ...args } ) => (
	<WithRegistrySetup func={ setupRegistry }>
		<WidgetWithComponentProps { ...args } />
	</WithRegistrySetup>
);

export const Ready = Template.bind( {} );
Ready.storyName = 'Ready';
Ready.args = {
	setupRegistry: setupAnalytics4MockReports,
};

export const GatheringData = Template.bind( {} );
GatheringData.storyName = 'GatheringData';
GatheringData.args = {
	setupRegistry: setupAnalytics4GatheringData,
};

export const ZeroData = Template.bind( {} );
ZeroData.storyName = 'Zero Data';
ZeroData.args = {
	setupRegistry: ( registry ) => {
		setupAnalytics4ZeroData( registry );
		setupSearchConsoleZeroData( registry );
	},
};

export const Loading = Template.bind( {} );
Loading.storyName = 'Loading';
Loading.args = {
	setupRegistry: setupAnalytics4Loading,
};

export const Error = Template.bind( {} );
Error.storyName = 'Error';
Error.args = {
	setupRegistry: setupAnalytics4Error,
};

export default {
	title: 'Views/WPDashboardApp/WPDashboardUniqueVisitorsGA4',
	decorators: widgetDecorators,
};
