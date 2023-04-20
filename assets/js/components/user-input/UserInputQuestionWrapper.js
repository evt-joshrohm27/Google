/**
 * User Input Question Wrapper.
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
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { Button } from 'googlesitekit-components';
import { CORE_USER } from '../../googlesitekit/datastore/user/constants';
import { Row, Cell } from '../../material-components';
import UserInputQuestionInfo from './UserInputQuestionInfo';
import ErrorNotice from '../ErrorNotice';
import CancelUserInputButton from './CancelUserInputButton';
import Link from '../Link';
import { hasErrorForAnswer } from './util/validation';
const { useSelect } = Data;

export default function UserInputQuestionWrapper( props ) {
	const {
		children,
		slug,
		isActive,
		questionNumber,
		title,
		description,
		next,
		nextLabel,
		back,
		backLabel,
		error,
	} = props;

	const values = useSelect(
		( select ) => select( CORE_USER ).getUserInputSetting( slug ) || []
	);

	return (
		<div
			className={ classnames( 'googlesitekit-user-input__question', {
				'googlesitekit-user-input__question--active': isActive,
				'googlesitekit-user-input__question--next': ! isActive,
			} ) }
		>
			<div className="googlesitekit-user-input__question-contents">
				<Row>
					<Cell lgSize={ 12 } mdSize={ 8 } smSize={ 4 }>
						<Row>
							{ title && (
								<UserInputQuestionInfo
									slug={ slug }
									title={ title }
									description={ description }
									questionNumber={ questionNumber }
								/>
							) }

							{ children }
						</Row>

						{ error && <ErrorNotice error={ error } /> }
					</Cell>
				</Row>
			</div>
			{ isActive && (
				<div className="googlesitekit-user-input__footer googlesitekit-user-input__buttons">
					<div className="googlesitekit-user-input__footer-nav">
						{ next && (
							<Button
								className="googlesitekit-user-input__buttons--next"
								onClick={ next }
								disabled={ hasErrorForAnswer( values ) }
							>
								{ nextLabel || __( 'Next', 'google-site-kit' ) }
							</Button>
						) }
						{ back && (
							<Link
								className="googlesitekit-user-input__buttons--back"
								onClick={ back }
							>
								{ backLabel || __( 'Back', 'google-site-kit' ) }
							</Link>
						) }
					</div>
					<div className="googlesitekit-user-input__footer-cancel">
						<CancelUserInputButton />
					</div>
				</div>
			) }
		</div>
	);
}

UserInputQuestionWrapper.propTypes = {
	slug: PropTypes.string.isRequired,
	questionNumber: PropTypes.number.isRequired,
	children: PropTypes.node,
	isActive: PropTypes.bool,
	title: PropTypes.string,
	description: PropTypes.string,
	next: PropTypes.func,
	nextLabel: PropTypes.string,
	back: PropTypes.func,
	backLabel: PropTypes.string,
	error: PropTypes.object,
};
