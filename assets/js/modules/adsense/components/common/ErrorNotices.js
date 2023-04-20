/**
 * AdSense Error Notices component.
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
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { MODULES_ADSENSE } from '../../datastore/constants';
import { errorToStatus } from '../../util/status';
import StoreErrorNotices from '../../../../components/StoreErrorNotices';
import { useFeature } from '../../../../hooks/useFeature';

export default function ErrorNotices() {
	const shouldDisplayError = useCallback(
		( error ) => undefined === errorToStatus( error ),
		[]
	);

	const adsenseSetupV2Enabled = useFeature( 'adsenseSetupV2' );

	return (
		<StoreErrorNotices
			moduleSlug="adsense"
			storeName={ MODULES_ADSENSE }
			shouldDisplayError={
				adsenseSetupV2Enabled ? undefined : shouldDisplayError
			}
		/>
	);
}
