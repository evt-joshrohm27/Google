/**
 * Analytics Account Select component.
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
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { ProgressBar } from 'googlesitekit-components';
import { Select, Option } from '../../../../material-components';
import { MODULES_ANALYTICS, ACCOUNT_CREATE } from '../../datastore/constants';
import { trackEvent } from '../../../../util';
import useViewContext from '../../../../hooks/useViewContext';
import {
	MODULES_ANALYTICS_4,
	PROPERTY_CREATE,
} from '../../../analytics-4/datastore/constants';
const { useSelect, useDispatch } = Data;

export default function AccountSelect( { hasModuleAccess } ) {
	const viewContext = useViewContext();

	const accountID = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getAccountID()
	);
	const accounts = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).getAccounts()
	);
	const hasResolvedAccounts = useSelect( ( select ) =>
		select( MODULES_ANALYTICS ).hasFinishedResolution( 'getAccounts' )
	);

	const { setPropertyID } = useDispatch( MODULES_ANALYTICS_4 );

	const { selectAccount } = useDispatch( MODULES_ANALYTICS );
	const onChange = useCallback(
		( index, item ) => {
			const newAccountID = item.dataset.value;
			if ( accountID !== newAccountID ) {
				selectAccount( newAccountID );

				// Reset the property ID.
				setPropertyID( PROPERTY_CREATE );
				const action =
					newAccountID === ACCOUNT_CREATE
						? 'change_account_new'
						: 'change_account';
				trackEvent( `${ viewContext }_analytics`, action );
			}
		},
		[ accountID, selectAccount, setPropertyID, viewContext ]
	);

	if ( ! hasResolvedAccounts ) {
		return <ProgressBar small />;
	}

	if ( hasModuleAccess === false ) {
		return (
			<Select
				className="googlesitekit-analytics__select-account"
				label={ __( 'Account', 'google-site-kit' ) }
				value={ accountID }
				enhanced
				outlined
				disabled
			>
				<Option value={ accountID }>{ accountID }</Option>
			</Select>
		);
	}

	return (
		<Select
			className="googlesitekit-analytics__select-account"
			label={ __( 'Account', 'google-site-kit' ) }
			value={ accountID }
			onEnhancedChange={ onChange }
			enhanced
			outlined
		>
			{ ( accounts || [] )
				.concat( {
					id: ACCOUNT_CREATE,
					name: __( 'Set up a new account', 'google-site-kit' ),
				} )
				.map( ( { id, name }, index ) => (
					<Option key={ index } value={ id }>
						{ name }
					</Option>
				) ) }
		</Select>
	);
}
