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
 * External dependencies
 */
import classnames from 'classnames';
import PropTypes from 'prop-types';

/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { __, _x, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { ProgressBar } from 'googlesitekit-components';
import { Select, Option } from '../../../../material-components';
import {
	MODULES_ANALYTICS_4,
	WEBDATASTREAM_CREATE,
} from '../../datastore/constants';
import { MODULES_ANALYTICS } from '../../../analytics/datastore/constants';
import { isValidAccountID } from '../../../analytics/util';
import {
	isValidPropertyID,
	isValidPropertySelection,
	isValidWebDataStreamSelection,
} from '../../utils/validation';
import { trackEvent } from '../../../../util';
import useViewContext from '../../../../hooks/useViewContext';
const { useSelect, useDispatch } = Data;

export default function WebDataStreamSelect( props ) {
	const { hasModuleAccess, isDisabled, className } = props;

	// Analytics accounts need to be loaded in order to load the properties,
	// otherwise this component will stay in a loading state forever.
	// eslint-disable-next-line no-unused-vars
	useSelect( ( select ) => select( MODULES_ANALYTICS ).getAccounts() );

	// TODO: Update this select hook to pull accountID from the modules/analytics-4
	// datastore when GA4 module becomes separated from the Analytics one.
	const accountID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getAccountID()
	);

	const { propertyID, webDataStreamID, measurementID } = useSelect(
		( select ) => select( MODULES_ANALYTICS_4 ).getSettings() || {}
	);

	const webDataStreams = useSelect( ( select ) =>
		isValidPropertyID( propertyID )
			? select(
					MODULES_ANALYTICS_4
			  ).getMatchingWebDataStreamsByPropertyID( propertyID )
			: []
	);

	const isLoading = useSelect( ( select ) => {
		if ( isDisabled ) {
			return false;
		}

		const loadedAccounts =
			select( MODULES_ANALYTICS ).hasFinishedResolution( 'getAccounts' );

		const loadedProperties = select(
			MODULES_ANALYTICS_4
		).hasFinishedResolution( 'getProperties', [ accountID ] );

		const loadedWebDataStreams = isValidPropertyID( propertyID )
			? select( MODULES_ANALYTICS_4 ).hasFinishedResolution(
					'getWebDataStreams',
					[ propertyID ]
			  )
			: true;

		const finishedSelectingAccount =
			select( MODULES_ANALYTICS ).hasFinishedSelectingAccount() !== false;

		const isMatchingAccountProperty =
			select( MODULES_ANALYTICS_4 ).isMatchingAccountProperty();

		return (
			isMatchingAccountProperty ||
			! loadedAccounts ||
			! loadedProperties ||
			! loadedWebDataStreams ||
			! finishedSelectingAccount
		);
	} );

	const viewContext = useViewContext();
	const { setWebDataStreamID, updateSettingsForMeasurementID } =
		useDispatch( MODULES_ANALYTICS_4 );
	const onWebDataStreamChange = useCallback(
		( index, { dataset } ) => {
			const newID = dataset.value;
			if ( webDataStreamID === newID ) {
				return;
			}

			setWebDataStreamID( newID );
			updateSettingsForMeasurementID(
				webDataStreams.find( ( { _id } ) => _id === newID )
					?.webStreamData?.measurementId || '' // eslint-disable-line sitekit/acronym-case
			);

			trackEvent(
				`${ viewContext }_analytics`,
				newID === WEBDATASTREAM_CREATE
					? 'change_webdatastream_new'
					: 'change_webdatastream',
				'ga4'
			);
		},
		[
			webDataStreams,
			webDataStreamID,
			setWebDataStreamID,
			updateSettingsForMeasurementID,
			viewContext,
		]
	);

	if ( ! isValidAccountID( accountID ) ) {
		return null;
	} else if ( isLoading ) {
		return <ProgressBar height={ 100 } small />;
	}

	const isValidSelection =
		webDataStreamID === undefined || webDataStreamID === ''
			? true
			: isValidWebDataStreamSelection( webDataStreamID );

	if ( hasModuleAccess === false ) {
		return (
			<Select
				className={ classnames(
					'googlesitekit-analytics-4__select-webdatastream',
					className
				) }
				label={ __( 'Web Data Stream', 'google-site-kit' ) }
				value={ measurementID }
				enhanced
				outlined
				disabled
			>
				<Option value={ measurementID }>{ measurementID }</Option>
			</Select>
		);
	}

	return (
		<Select
			className={ classnames(
				'googlesitekit-analytics-4__select-webdatastream',
				className,
				{
					'mdc-select--invalid': ! isValidSelection,
				}
			) }
			label={ __( 'Web Data Stream', 'google-site-kit' ) }
			value={ webDataStreamID }
			onEnhancedChange={ onWebDataStreamChange }
			disabled={ isDisabled || ! isValidPropertySelection( propertyID ) }
			enhanced
			outlined
		>
			{ ( webDataStreams || [] )
				.concat( {
					_id: WEBDATASTREAM_CREATE,
					displayName: __(
						'Set up a new web data stream',
						'google-site-kit'
					),
				} )
				.map( ( { _id, displayName, webStreamData = {} }, index ) => (
					<Option key={ index } value={ _id }>
						{ _id === WEBDATASTREAM_CREATE ||
						! webStreamData?.measurementId // eslint-disable-line sitekit/acronym-case
							? displayName
							: sprintf(
									/* translators: 1: Data stream name. 2: Measurement ID. */
									_x(
										'%1$s (%2$s)',
										'Analytics 4 data stream name and measurement ID',
										'google-site-kit'
									),
									displayName,
									webStreamData.measurementId // eslint-disable-line sitekit/acronym-case
							  ) }
					</Option>
				) ) }
		</Select>
	);
}

WebDataStreamSelect.propTypes = {
	hasModuleAccess: PropTypes.bool,
	isDisabled: PropTypes.bool,
	className: PropTypes.string,
};
