/**
 * Alert component.
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
import { isPlainObject } from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component, Fragment } from '@wordpress/element';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import BannerNotification from './notifications/BannerNotification';

class Alert extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			isLoading: true,
			alerts: [],
			error: false,
			message: '',
		};
	}

	componentDidMount() {
		this.getAlert();
	}

	async getAlert() {
		try {
			const { module } = this.props;

			// Fetching the data, could be from the cache or rest endpoint.
			const alerts = await API.get( 'modules', module, 'notifications' );

			this.setState( {
				isLoading: false,
				error: false,
				alerts,
			} );
		} catch ( err ) {
			this.setState( {
				isLoading: false,
				error: err.code,
			} );
		}
	}

	render() {
		const { alerts, error, isLoading } = this.state;

		if ( error || isLoading || ! alerts || ! alerts.length ) {
			return null;
		}

		const notifications = alerts
			.filter( ( item ) => isPlainObject( item ) && item.title?.length )
			.map( ( item ) => (
				<BannerNotification
					id={ item.id }
					key={ item.id }
					title={ item.title }
					description={ item.message || item.description }
					dismiss={ __( 'Dismiss', 'google-site-kit' ) }
					isDismissible={ item.isDismissible }
					format="small"
					ctaLink={ item.ctaURL }
					ctaLabel={ item.ctaLabel }
					ctaTarget={ item.ctaTarget }
					type={ item.severity }
				/>
			) );

		return <Fragment>{ notifications }</Fragment>;
	}
}

Alert.propTypes = {
	module: PropTypes.string.isRequired,
};

export default Alert;
