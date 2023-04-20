/**
 * ErrorNotice component.
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

/**
 * WordPress dependencies
 */
import { Fragment, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { Button } from 'googlesitekit-components';
import { isPermissionScopeError, isErrorRetryable } from '../util/errors';
import ErrorText from './ErrorText';

const { useSelect, useDispatch } = Data;

export default function ErrorNotice( {
	error,
	storeName,
	message = error.message,
	shouldDisplayError = () => true,
} ) {
	const dispatch = useDispatch();

	const selectorData = useSelect( ( select ) => {
		if ( ! storeName ) {
			return null;
		}

		return select( storeName ).getSelectorDataForError( error );
	} );

	const handleRetry = useCallback( () => {
		dispatch( selectorData.storeName ).invalidateResolution(
			selectorData.name,
			selectorData.args
		);
	}, [ dispatch, selectorData ] );

	// Do not display if there is no error, or if the error is for missing scopes.
	if (
		! error ||
		isPermissionScopeError( error ) ||
		! shouldDisplayError( error )
	) {
		return null;
	}

	const shouldDisplayRetry = isErrorRetryable( error, selectorData );

	return (
		<Fragment>
			<ErrorText
				message={ message }
				reconnectURL={ error.data?.reconnectURL }
			/>
			{ shouldDisplayRetry && (
				<Button onClick={ handleRetry }>
					{ __( 'Retry', 'google-site-kit' ) }
				</Button>
			) }
		</Fragment>
	);
}

ErrorNotice.propTypes = {
	error: PropTypes.shape( {
		message: PropTypes.string,
	} ),
	storeName: PropTypes.string,
	message: PropTypes.string,
	shouldDisplayError: PropTypes.func,
};
