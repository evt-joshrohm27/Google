/**
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

export const UNIQUE_VISITORS_CHART_OPTIONS = {
	animation: {
		startup: true,
	},
	chart: {
		title: __( 'Unique visitors', 'google-site-kit' ),
	},
	curveType: 'function',
	height: 270,
	width: '100%',
	chartArea: {
		height: '80%',
		left: 20,
		right: 20,
	},
	legend: {
		position: 'top',
		textStyle: {
			color: '#616161',
			fontSize: 12,
		},
	},
	hAxis: {
		format: 'M/d/yy',
		gridlines: {
			color: '#fff',
		},
		textStyle: {
			color: '#616161',
			fontSize: 12,
		},
	},
	vAxis: {
		textPosition: 'none',
		viewWindow: {
			min: 0,
		},
		gridlines: {
			color: '#eee',
		},
	},
	series: {
		0: {
			color: '#6380b8',
			targetAxisIndex: 0,
		},
		1: {
			color: '#6380b8',
			targetAxisIndex: 0,
			lineDashStyle: [ 3, 3 ],
			lineWidth: 1,
		},
	},
	focusTarget: 'category',
	crosshair: {
		color: 'gray',
		opacity: 0.1,
		orientation: 'vertical',
		trigger: 'both',
	},
	tooltip: {
		isHtml: true, // eslint-disable-line sitekit/acronym-case
		trigger: 'both',
	},
};
