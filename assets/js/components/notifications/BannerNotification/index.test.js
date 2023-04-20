/**
 * BannerNotification component tests.
 *
 * Site Kit by Google, Copyright 2022 Google LLC
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
import { getByText } from '@testing-library/dom';

/**
 * Internal dependencies
 */
import BannerNotification from './index';
import { render } from '../../../../../tests/js/test-utils';

describe( 'BannerNotification', () => {
	it( 'should wrap the description in a paragraph when the description is not a React element', () => {
		const { container } = render(
			<BannerNotification
				id="fake"
				title="Hey there!"
				description="I am string, not React element"
			/>
		);

		expect(
			getByText(
				container.querySelector(
					'.googlesitekit-publisher-win__desc > p'
				),
				/I am string, not React element/
			)
		).toBeInTheDocument();

		expect( container.querySelector( '.sk-react-element' ) ).toBeFalsy();

		expect( container ).toMatchSnapshot();
	} );

	it( 'should not wrap the description in a paragraph when the description is a React element', () => {
		const { container } = render(
			<BannerNotification
				id="fake"
				title="Hey there!"
				description={
					<p className="sk-react-element">I am React element</p>
				}
			/>
		);

		expect(
			getByText(
				container.querySelector(
					'.googlesitekit-publisher-win__desc > .sk-react-element'
				),
				/I am React element/
			)
		).toBeInTheDocument();

		expect( container ).toMatchSnapshot();
	} );
} );
