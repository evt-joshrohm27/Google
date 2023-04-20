/**
 * Activation component.
 *
 * This JavaScript loads on every admin page. Reserved for later.
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
import domReady from '@wordpress/dom-ready';
import { render } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { ActivationApp } from './components/activation/activation-app';
import { VIEW_CONTEXT_ACTIVATION } from './googlesitekit/constants';
import Root from './components/Root';

domReady( () => {
	const renderTarget = document.getElementById(
		'js-googlesitekit-activation'
	);

	if ( renderTarget ) {
		render(
			<Root viewContext={ VIEW_CONTEXT_ACTIVATION }>
				<ActivationApp />
			</Root>,
			renderTarget
		);

		renderTarget.classList.remove( 'googlesitekit-activation--loading' );
	}
} );
