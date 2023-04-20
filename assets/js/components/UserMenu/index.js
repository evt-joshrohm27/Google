/**
 * UserMenu component.
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
import { useClickAway } from 'react-use';

/**
 * WordPress dependencies
 */
import {
	Fragment,
	useState,
	useRef,
	useEffect,
	useCallback,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ESCAPE, TAB } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { Button, Dialog, Menu } from 'googlesitekit-components';
import { trackEvent } from '../../util';
import { clearCache } from '../../googlesitekit/api/cache';
import Portal from '../Portal';
import Details from './Details';
import Item from './Item';
import DisconnectIcon from '../../../svg/icons/disconnect.svg';
import ManageSitesIcon from '../../../svg/icons/manage-sites.svg';
import { CORE_SITE } from '../../googlesitekit/datastore/site/constants';
import { CORE_USER } from '../../googlesitekit/datastore/user/constants';
import { CORE_LOCATION } from '../../googlesitekit/datastore/location/constants';
import { useKeyCodesInside } from '../../hooks/useKeyCodesInside';
import useViewContext from '../../hooks/useViewContext';
const { useSelect, useDispatch } = Data;

export default function UserMenu() {
	const proxyPermissionsURL = useSelect( ( select ) =>
		select( CORE_SITE ).getProxyPermissionsURL()
	);
	const userEmail = useSelect( ( select ) => select( CORE_USER ).getEmail() );
	const userPicture = useSelect( ( select ) =>
		select( CORE_USER ).getPicture()
	);
	const userFullName = useSelect( ( select ) =>
		select( CORE_USER ).getFullName()
	);
	const postDisconnectURL = useSelect( ( select ) =>
		select( CORE_SITE ).getAdminURL( 'googlesitekit-splash', {
			googlesitekit_context: 'revoked',
		} )
	);

	const [ dialogActive, toggleDialog ] = useState( false );
	const [ menuOpen, setMenuOpen ] = useState( false );
	const menuWrapperRef = useRef();
	const viewContext = useViewContext();
	const { navigateTo } = useDispatch( CORE_LOCATION );

	useClickAway( menuWrapperRef, () => setMenuOpen( false ) );
	useKeyCodesInside( [ ESCAPE, TAB ], menuWrapperRef, () =>
		setMenuOpen( false )
	);

	useEffect( () => {
		const handleDialogClose = ( e ) => {
			// Close if Escape key is pressed.
			if ( ESCAPE === e.keyCode ) {
				toggleDialog( false );
				setMenuOpen( false );
			}
		};

		global.addEventListener( 'keyup', handleDialogClose );

		return () => {
			global.removeEventListener( 'keyup', handleDialogClose );
		};
	}, [] );

	const handleMenu = useCallback( () => {
		if ( ! menuOpen ) {
			trackEvent( `${ viewContext }_headerbar`, 'open_usermenu' );
		}

		setMenuOpen( ! menuOpen );
	}, [ menuOpen, viewContext ] );

	const handleDialog = useCallback( () => {
		toggleDialog( ! dialogActive );
		setMenuOpen( false );
	}, [ dialogActive ] );

	const handleMenuItemSelect = useCallback(
		async ( _index, event ) => {
			const {
				detail: { item },
			} = event;

			switch ( item?.id ) {
				case 'manage-sites':
					if ( proxyPermissionsURL ) {
						await trackEvent(
							`${ viewContext }_headerbar_usermenu`,
							'manage_sites'
						);
						navigateTo( proxyPermissionsURL );
					}
					break;
				case 'disconnect':
					handleDialog();
					break;
				default:
					handleMenu();
			}
		},
		[
			proxyPermissionsURL,
			handleMenu,
			handleDialog,
			navigateTo,
			viewContext,
		]
	);

	// Log the user out if they confirm the dialog.
	const handleUnlinkConfirm = useCallback( async () => {
		// Close the modal.
		toggleDialog( false );

		await clearCache();

		await trackEvent(
			`${ viewContext }_headerbar_usermenu`,
			'disconnect_user'
		);

		// Navigate back to the splash screen to reconnect.
		navigateTo( postDisconnectURL );
	}, [ postDisconnectURL, navigateTo, viewContext ] );

	if ( ! userEmail ) {
		return null;
	}

	return (
		<Fragment>
			<div
				ref={ menuWrapperRef }
				className="googlesitekit-user-selector googlesitekit-dropdown-menu googlesitekit-dropdown-menu__icon-menu mdc-menu-surface--anchor"
			>
				<Button
					className="googlesitekit-header__dropdown mdc-button--dropdown googlesitekit-border-radius-round--tablet googlesitekit-border-radius-round--phone googlesitekit-border-radius-round googlesitekit-button-icon"
					text
					onClick={ handleMenu }
					icon={
						!! userPicture && (
							<i
								className="mdc-button__icon mdc-button__account"
								aria-hidden="true"
							>
								<img
									className="mdc-button__icon--image"
									src={ userPicture }
									alt={ __(
										'User Avatar',
										'google-site-kit'
									) }
								/>
							</i>
						)
					}
					aria-haspopup="menu"
					aria-expanded={ menuOpen }
					aria-controls="user-menu"
					aria-label={ __( 'Account', 'google-site-kit' ) }
					tooltip
					customizedTooltip={
						<Fragment>
							<strong>
								{ __( 'Google Account', 'google-site-kit' ) }
							</strong>
							<br />
							<br />
							{ userFullName }
							{ userFullName && <br /> }
							{ userEmail }
						</Fragment>
					}
				/>

				<Menu
					className="googlesitekit-user-menu"
					menuOpen={ menuOpen }
					onSelected={ handleMenuItemSelect }
					id="user-menu"
				>
					<li>
						<Details />
					</li>
					{ !! proxyPermissionsURL && (
						<li
							id="manage-sites"
							className="mdc-list-item"
							role="menuitem"
						>
							<Item
								icon={ <ManageSitesIcon width="22" /> }
								label={ __(
									'Manage Sites',
									'google-site-kit'
								) }
							/>
						</li>
					) }
					<li
						id="disconnect"
						className="mdc-list-item"
						role="menuitem"
					>
						<Item
							icon={ <DisconnectIcon width="22" /> }
							label={ __( 'Disconnect', 'google-site-kit' ) }
						/>
					</li>
				</Menu>
			</div>
			<Portal>
				<Dialog
					dialogActive={ dialogActive }
					handleConfirm={ handleUnlinkConfirm }
					handleDialog={ handleDialog }
					title={ __( 'Disconnect', 'google-site-kit' ) }
					subtitle={ __(
						'Disconnecting Site Kit by Google will remove your access to all services. After disconnecting, you will need to re-authorize to restore service.',
						'google-site-kit'
					) }
					confirmButton={ __( 'Disconnect', 'google-site-kit' ) }
					danger
				/>
			</Portal>
		</Fragment>
	);
}
