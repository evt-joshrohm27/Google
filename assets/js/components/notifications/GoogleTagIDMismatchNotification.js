/**
 * GoogleTagIDMismatchNotification component.
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
import { __, sprintf } from '@wordpress/i18n';
import { Fragment, useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { MODULES_ANALYTICS_4 } from '../../modules/analytics-4/datastore/constants';
import { isValidMeasurementID } from '../../modules/analytics-4/utils/validation';
import { SpinnerButton, ProgressBar } from 'googlesitekit-components';
import BannerNotification from './BannerNotification';
import Link from '../Link';
import { CORE_MODULES } from '../../googlesitekit/modules/datastore/constants';
import { Cell, Grid, Row } from '../../material-components';
import { getBestTagID } from '../../modules/analytics-4/utils/google-tag';

const { useSelect, useDispatch } = Data;

export default function GoogleTagIDMismatchNotification() {
	const hasMismatchedGoogleTagID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).hasMismatchedGoogleTagID()
	);

	const currentAnalyticsConfig = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).getSettings()
	);

	const googleTagContainerDestinations = useSelect(
		( select ) =>
			hasMismatchedGoogleTagID &&
			currentAnalyticsConfig?.googleTagAccountID &&
			currentAnalyticsConfig?.googleTagContainerID &&
			select( MODULES_ANALYTICS_4 ).getGoogleTagContainerDestinations(
				currentAnalyticsConfig.googleTagAccountID,
				currentAnalyticsConfig.googleTagContainerID
			)
	);

	const currentAnalyticsProperty = useSelect(
		( select ) =>
			currentAnalyticsConfig?.propertyID &&
			select( MODULES_ANALYTICS_4 ).getProperty(
				currentAnalyticsConfig.propertyID
			)
	);

	const newAnalyticsConfig = useSelect( ( select ) => {
		if (
			! hasMismatchedGoogleTagID ||
			! Array.isArray( googleTagContainerDestinations )
		) {
			return null;
		}

		const destinationIDs = googleTagContainerDestinations.map(
			// eslint-disable-next-line sitekit/acronym-case
			( destination ) => destination.destinationId
		);

		const validGA4MeasurementIDs =
			destinationIDs.filter( isValidMeasurementID );

		if ( validGA4MeasurementIDs.length === 0 ) {
			return null;
		}

		return select( MODULES_ANALYTICS_4 ).getAnalyticsConfigByMeasurementIDs(
			validGA4MeasurementIDs
		);
	} );

	const newAnalyticsProperty = useSelect(
		( select ) =>
			newAnalyticsConfig &&
			newAnalyticsConfig.propertyID &&
			select( MODULES_ANALYTICS_4 ).getProperty(
				newAnalyticsConfig?.propertyID
			)
	);

	const newGoogleTagID = useSelect( ( select ) => {
		const tagIDs =
			currentAnalyticsConfig?.measurementID &&
			select( MODULES_ANALYTICS_4 ).getGoogleTagContainer(
				currentAnalyticsConfig?.measurementID
			)?.tagIds; // eslint-disable-line sitekit/acronym-case

		if ( Array.isArray( tagIDs ) ) {
			return getBestTagID( tagIDs, currentAnalyticsConfig.measurementID );
		}
	} );

	const isDoingSubmitChanges = useSelect( ( select ) =>
		select( CORE_MODULES ).isDoingSubmitChanges( 'analytics-4' )
	);

	const {
		setPropertyID,
		setWebDataStreamID,
		setMeasurementID,
		updateSettingsForMeasurementID,
		submitChanges,
		setHasMismatchedGoogleTagID,
	} = useDispatch( MODULES_ANALYTICS_4 );

	const updateToNewAnalyticsConfig = useCallback( async () => {
		setPropertyID( newAnalyticsConfig?.propertyID );
		setWebDataStreamID( newAnalyticsConfig?.webDataStreamID );
		setMeasurementID( newAnalyticsConfig?.measurementID );
		await submitChanges();
		setHasMismatchedGoogleTagID( false );
	}, [
		setPropertyID,
		setWebDataStreamID,
		setMeasurementID,
		newAnalyticsConfig?.propertyID,
		newAnalyticsConfig?.webDataStreamID,
		newAnalyticsConfig?.measurementID,
		submitChanges,
		setHasMismatchedGoogleTagID,
	] );

	const updateGoogleTagConfig = useCallback( async () => {
		await updateSettingsForMeasurementID(
			currentAnalyticsConfig?.measurementID
		);
		await submitChanges();
		setHasMismatchedGoogleTagID( false );
	}, [
		updateSettingsForMeasurementID,
		currentAnalyticsConfig?.measurementID,
		submitChanges,
		setHasMismatchedGoogleTagID,
	] );

	if ( ! hasMismatchedGoogleTagID ) {
		return null;
	}

	if (
		googleTagContainerDestinations === undefined ||
		newAnalyticsProperty === undefined ||
		newGoogleTagID === undefined ||
		currentAnalyticsProperty === undefined
	) {
		// Wrap in the googlesitekit-publisher-win class to ensure the output is treated in the same way as BannerNotification,
		// with only one instance visible on the screen at a time.
		return (
			<div className="googlesitekit-publisher-win">
				<Grid>
					<Row>
						<Cell size={ 12 }>
							<ProgressBar />
						</Cell>
					</Row>
				</Grid>
			</div>
		);
	}

	if ( newAnalyticsProperty ) {
		return (
			<BannerNotification
				id="google-tag-id-mismatch"
				title={ __(
					"Update Site Kit's Analytics configuration to continue seeing Analytics data on the dashboard",
					'google-site-kit'
				) }
				description={ sprintf(
					/* translators: 1: Currently GA4 property name. 2: Current GA4 property ID. 3: Newly linked GA4 property name. 4: Newly linked GA4 property ID. */
					__(
						'The Google Tag on your site is no longer associated with your current Google Analytics 4 property "%1$s (%2$s)". It is now recording metrics to another Google Analytics 4 property "%3$s (%4$s)". If you want to continue seeing Analytics data in the Site Kit dashboard, we suggest you switch Site Kit’s Google Analytics configuration to show data for this property.',
						'google-site-kit'
					),
					currentAnalyticsProperty.displayName,
					currentAnalyticsProperty._id,
					newAnalyticsProperty.displayName,
					newAnalyticsProperty._id
				) }
				ctaComponent={
					<Fragment>
						<SpinnerButton
							onClick={ updateToNewAnalyticsConfig }
							isSaving={ isDoingSubmitChanges }
						>
							{ sprintf(
								/* translators: 1: Newly linked GA4 property name. 2: Newly linked GA4 property ID. */
								__( 'Use %1$s (%2$s)', 'google-site-kit' ),
								newAnalyticsProperty.displayName,
								newAnalyticsProperty._id
							) }
						</SpinnerButton>
						<Link onClick={ updateGoogleTagConfig }>
							{ sprintf(
								/* translators: 1: Currently GA4 property name. 2: Current GA4 property ID. */
								__(
									'Update Google tag to keep using %1$s (%2$s)',
									'google-site-kit'
								),
								currentAnalyticsProperty.displayName,
								currentAnalyticsProperty._id
							) }
						</Link>
					</Fragment>
				}
				isDismissible={ false }
			/>
		);
	}

	if ( newGoogleTagID ) {
		return (
			<BannerNotification
				id="google-tag-id-mismatch"
				title={ __(
					'Your Google tag configuration has changed',
					'google-site-kit'
				) }
				description={ sprintf(
					/* translators: 1: Currently set Google Tag ID. 2: Newly linked Google Tag ID. 3: Currently GA4 property name. 4: Current GA4 property ID. */
					__(
						'The Google tag for your Google Analytics 4 configuration has changed from %1$s to %2$s. To keep using your current Google Analytics 4 property "%3$s (%4$s)", you need to configure Site Kit to place the new Google tag %2$s instead.',
						'google-site-kit'
					),
					currentAnalyticsConfig.googleTagID,
					newGoogleTagID,
					currentAnalyticsProperty.displayName,
					currentAnalyticsProperty._id
				) }
				ctaLabel={ sprintf(
					/* translators: %s: Newly linked Google Tag ID. */
					__( 'Update Google tag to %s', 'google-site-kit' ),
					newGoogleTagID
				) }
				ctaLink={ updateGoogleTagConfig ? '#' : null }
				onCTAClick={ updateGoogleTagConfig }
				isDismissible={ false }
			/>
		);
	}
}
