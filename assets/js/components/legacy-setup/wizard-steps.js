/**
 * WizardSteps data map.
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
 * WordPress dependencies
 */
import { __, _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import WizardStepAuthentication from './wizard-step-authentication';
import WizardStepVerification from './wizard-step-verification';
import WizardStepSearchConsoleProperty from './wizard-step-search-console-property';
import WizardStepCompleteSetup from './wizard-step-complete-setup';

const STEPS = {
	authentication: {
		title: __( 'Authenticate', 'google-site-kit' ),
		required: true,
		isApplicable: () => true,
		isCompleted: ( props ) =>
			props.isSiteKitConnected &&
			props.isAuthenticated &&
			! props.needReauthenticate,
		Component: WizardStepAuthentication,
	},
	verification: {
		title: __( 'Verify URL', 'google-site-kit' ),
		required: true,
		isApplicable: () => true,
		isCompleted: ( props ) =>
			props.isSiteKitConnected &&
			props.isAuthenticated &&
			props.isVerified,
		Component: WizardStepVerification,
	},
	seachConsoleProperty: {
		title: __( 'Connect Search Console', 'google-site-kit' ),
		required: true,
		isApplicable: () => true,
		isCompleted: ( props ) =>
			props.isSiteKitConnected &&
			props.isAuthenticated &&
			props.isVerified &&
			props.hasSearchConsoleProperty,
		Component: WizardStepSearchConsoleProperty,
	},
	completeSetup: {
		title: _x( 'Finish', 'complete module setup', 'google-site-kit' ),
		required: false,
		isApplicable: () => true,
		isCompleted: ( props ) =>
			props.isSiteKitConnected &&
			props.isAuthenticated &&
			props.isVerified &&
			props.hasSearchConsoleProperty,
		Component: WizardStepCompleteSetup,
	},
};

export default STEPS;
