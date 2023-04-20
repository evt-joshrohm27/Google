/**
 * User Input Preview Group.
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
import PropTypes from 'prop-types';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Fragment, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { SpinnerButton } from 'googlesitekit-components';
import Data from 'googlesitekit-data';
import { CORE_UI } from '../../googlesitekit/datastore/ui/constants';
import { CORE_USER } from '../../googlesitekit/datastore/user/constants';
import { CORE_LOCATION } from '../../googlesitekit/datastore/location/constants';
import { trackEvent } from '../../util';
import { getErrorMessageForAnswer } from './util/validation';
import useViewContext from '../../hooks/useViewContext';
import {
	USER_INPUT_CURRENTLY_EDITING_KEY,
	USER_INPUT_MAX_ANSWERS,
} from './util/constants';
import ErrorNotice from '../ErrorNotice';
import Link from '../Link';
import UserInputSelectOptions from './UserInputSelectOptions';
import UserInputQuestionAuthor from './UserInputQuestionAuthor';
import ChevronDownIcon from '../../../svg/icons/chevron-down.svg';

const { useSelect, useDispatch } = Data;

export default function UserInputPreviewGroup( {
	slug,
	title,
	values,
	options,
	errorMessage,
	onCollapse,
	showIndividualCTAs = false,
} ) {
	const viewContext = useViewContext();
	const isNavigating = useSelect( ( select ) =>
		select( CORE_LOCATION ).isNavigating()
	);
	const currentlyEditingSlug = useSelect( ( select ) =>
		select( CORE_UI ).getValue( USER_INPUT_CURRENTLY_EDITING_KEY )
	);
	const hasSettingChanged = useSelect( ( select ) =>
		select( CORE_USER ).hasUserInputSettingChanged( slug )
	);
	const isSavingSettings = useSelect( ( select ) => {
		const userInputSettings = select( CORE_USER ).getUserInputSettings();

		return select( CORE_USER ).isSavingUserInputSettings(
			userInputSettings
		);
	} );
	const saveSettingsError = useSelect( ( select ) =>
		select( CORE_USER ).getErrorForAction( 'saveUserInputSettings', [] )
	);
	const { setValues } = useDispatch( CORE_UI );
	const { saveUserInputSettings, resetUserInputSettings } =
		useDispatch( CORE_USER );

	const isEditing = currentlyEditingSlug === slug;
	const isScreenLoading = isSavingSettings || isNavigating;

	const toggleEditMode = useCallback( () => {
		if ( ! isEditing ) {
			trackEvent( viewContext, 'question_edit', slug );
		} else {
			onCollapse();
		}

		setValues( {
			[ USER_INPUT_CURRENTLY_EDITING_KEY ]: isEditing ? undefined : slug,
		} );
	}, [ isEditing, onCollapse, setValues, slug, viewContext ] );

	const error = getErrorMessageForAnswer(
		values,
		USER_INPUT_MAX_ANSWERS[ slug ]
	);

	const submitChanges = useCallback( async () => {
		const response = await saveUserInputSettings();

		if ( ! response.error ) {
			toggleEditMode();
		}
	}, [ saveUserInputSettings, toggleEditMode ] );

	const handleOnEditClick = useCallback( async () => {
		if ( showIndividualCTAs ) {
			if (
				isScreenLoading ||
				( !! currentlyEditingSlug && ! isEditing )
			) {
				return;
			}

			// Do not preserve changes if preview group is collapsed with individual CTAs.
			if ( isEditing ) {
				await resetUserInputSettings();
			}
		}

		toggleEditMode();
	}, [
		showIndividualCTAs,
		isScreenLoading,
		currentlyEditingSlug,
		isEditing,
		resetUserInputSettings,
		toggleEditMode,
	] );

	const handleOnCancelClick = useCallback( async () => {
		if ( isScreenLoading ) {
			return;
		}

		await resetUserInputSettings();
		toggleEditMode();
	}, [ isScreenLoading, resetUserInputSettings, toggleEditMode ] );

	return (
		<div
			className={ classnames( 'googlesitekit-user-input__preview-group', {
				'googlesitekit-user-input__preview-group--editing': isEditing,
				'googlesitekit-user-input__preview-group--individual-cta':
					showIndividualCTAs,
			} ) }
		>
			<div className="googlesitekit-user-input__preview-group-title">
				<p>{ title }</p>
				<Link
					onClick={ handleOnEditClick }
					disabled={
						isScreenLoading ||
						( !! currentlyEditingSlug && ! isEditing )
					}
				>
					{ __( 'Edit', 'google-site-kit' ) }

					<ChevronDownIcon width={ 20 } height={ 20 } />
				</Link>
			</div>

			{ ! isEditing && (
				<div className="googlesitekit-user-input__preview-answers">
					{ error && (
						<p className="googlesitekit-error-text">{ error }</p>
					) }

					{ ! error &&
						values.map( ( value ) => (
							<div
								key={ value }
								className="googlesitekit-user-input__preview-answer"
							>
								{ options[ value ] }
							</div>
						) ) }
				</div>
			) }

			{ isEditing && (
				<Fragment>
					<UserInputSelectOptions
						isActive={ true }
						slug={ slug }
						max={ USER_INPUT_MAX_ANSWERS[ slug ] }
						options={ options }
					/>
					{ errorMessage && (
						<p className="googlesitekit-error-text">
							{ errorMessage }
						</p>
					) }
					{ showIndividualCTAs && (
						<Fragment>
							<UserInputQuestionAuthor slug={ slug } />

							{ saveSettingsError && (
								<ErrorNotice error={ saveSettingsError } />
							) }

							<div className="googlesitekit-user-input__preview-actions">
								<SpinnerButton
									disabled={ ! hasSettingChanged }
									onClick={
										hasSettingChanged
											? submitChanges
											: undefined
									}
									isSaving={ isScreenLoading }
								>
									{ __(
										'Confirm Changes',
										'google-site-kit'
									) }
								</SpinnerButton>
								<Link
									disabled={ isScreenLoading }
									onClick={ handleOnCancelClick }
								>
									{ __( 'Cancel', 'google-site-kit' ) }
								</Link>
							</div>
						</Fragment>
					) }
				</Fragment>
			) }
		</div>
	);
}

UserInputPreviewGroup.propTypes = {
	slug: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	values: PropTypes.arrayOf( PropTypes.string ).isRequired,
	options: PropTypes.shape( {} ),
	errorMessage: PropTypes.string,
	onCollapse: PropTypes.func,
	showIndividualCTAs: PropTypes.bool,
};

UserInputPreviewGroup.defaultProps = {
	options: {},
};
