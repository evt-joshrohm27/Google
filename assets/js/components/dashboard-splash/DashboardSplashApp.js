/**
 * DashboardSplashApp component.
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
import Data from 'googlesitekit-data';
import { CORE_SITE } from '../../googlesitekit/datastore/site/constants';
import {
	CORE_USER,
	PERMISSION_AUTHENTICATE,
} from '../../googlesitekit/datastore/user/constants';
import { useFeature } from '../../hooks/useFeature';
import SetupUsingProxyWithSignIn from '../setup/SetupUsingProxyWithSignIn';
import SetupUsingProxyViewOnly from '../setup/SetupUsingProxyViewOnly';
import SetupUsingGCP from '../legacy-setup/SetupUsingGCP';
const { useSelect } = Data;

export default function DashboardSplashApp() {
	const dashboardSharing = useFeature( 'dashboardSharing' );

	const usingProxy = useSelect( ( select ) =>
		select( CORE_SITE ).isUsingProxy()
	);
	const canAuthenticate = useSelect( ( select ) =>
		select( CORE_USER ).hasCapability( PERMISSION_AUTHENTICATE )
	);

	if ( usingProxy === true ) {
		if ( dashboardSharing && ! canAuthenticate ) {
			return <SetupUsingProxyViewOnly />;
		}

		return <SetupUsingProxyWithSignIn />;
	}

	if ( usingProxy === false ) {
		return <SetupUsingGCP />;
	}

	return null;
}
