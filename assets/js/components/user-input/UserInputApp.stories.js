/**
 * User Input Stories.
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
import { withQuery } from '@storybook/addon-queryparams';
import fetchMock from 'fetch-mock';

/**
 * Internal dependencies
 */
import UserInputApp from './UserInputApp';
import { CORE_USER } from '../../googlesitekit/datastore/user/constants';
import { WithTestRegistry } from '../../../../tests/js/utils';

const Template = () => <UserInputApp />;

export const Default = Template.bind( {} );
Default.storyName = 'Default';

export const MultipleAdmins = Template.bind( {} );
MultipleAdmins.storyName = 'Multiple Admins';
MultipleAdmins.decorators = [
	withQuery,
	( Story ) => {
		fetchMock.getOnce(
			new RegExp(
				'^/google-site-kit/v1/core/user/data/user-input-settings'
			),
			{
				body: {
					goals: {
						scope: 'site',
						values: [ 'publish_blog', 'share_portfolio' ],
						author: {
							photo: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
							login: 'admin',
						},
					},
					helpNeeded: {
						scope: 'site',
						values: [],
					},
					searchTerms: {
						scope: 'site',
						values: [],
					},
					postFrequency: {
						scope: 'user',
						values: [ 'never' ],
					},
					role: {
						scope: 'user',
						values: [ 'owner' ],
					},
				},
				status: 200,
			}
		);

		return <Story />;
	},
];
MultipleAdmins.parameters = {
	query: {
		question: 'goals',
	},
};

export default {
	title: 'Components/User Input',
	component: UserInputApp,
	decorators: [
		withQuery,
		( Story ) => {
			return (
				<WithTestRegistry
					callback={ ( registry ) => {
						// Don't mark the user input as completed in this story.
						registry
							.dispatch( CORE_USER )
							.receiveIsUserInputCompleted( false );
					} }
					features={ [ 'userInput' ] }
				>
					<Story />
				</WithTestRegistry>
			);
		},
	],
	parameters: {
		query: {
			question: 'role',
		},
	},
};
