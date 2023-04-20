/**
 * Utility functions.
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
import { isFinite, unescape } from 'lodash';

/**
 * Internal dependencies
 */
import { trackEvent } from './tracking';
export { trackEvent };
export * from './sanitize';
export * from './stringify';
export * from './standalone';
export * from './storage';
export * from './i18n';
export * from './markdown';
export * from './convert-time';
export * from './date-range';
export * from './chart';
export * from './urls';
export * from './is-valid-numeric-id';
export * from './isnumeric';

/**
 * Transforms a period string into a number of seconds.
 *
 * @since 1.0.0
 *
 * @param {string} period The period to transform.
 * @return {number} The number of seconds.
 */
export const getTimeInSeconds = ( period ) => {
	const minute = 60;
	const hour = minute * 60;
	const day = hour * 24;
	const week = day * 7;
	const month = day * 30;
	const year = day * 365;
	switch ( period ) {
		case 'minute':
			return minute;

		case 'hour':
			return hour;

		case 'day':
			return day;

		case 'week':
			return week;

		case 'month':
			return month;

		case 'year':
			return year;
	}
};

/**
 * Calculates the change between two values.
 *
 * @since 1.24.0
 *
 * @param {number} previous The previous value.
 * @param {number} current  The current value.
 * @return {(number|null)} The percent change. Null if the input or output is invalid.
 */
export const calculateChange = ( previous, current ) => {
	// Prevent divide by zero errors.
	if ( '0' === previous || 0 === previous || isNaN( previous ) ) {
		return null;
	}

	const change = ( current - previous ) / previous;

	// Avoid NaN at all costs.
	if ( isNaN( change ) || ! isFinite( change ) ) {
		return null;
	}

	return change;
};

/**
 * Verifies whether JSON is valid.
 *
 * @since 1.0.0
 *
 * @param {string} stringToValidate The string to validate.
 * @return {boolean} Indicates JSON is valid.
 */
export const validateJSON = ( stringToValidate ) => {
	try {
		return JSON.parse( stringToValidate ) && !! stringToValidate;
	} catch ( e ) {
		return false;
	}
};

/**
 * Converts HTML text into an HTML entity.
 *
 * _.unescape doesn't seem to decode some entities for admin bar titles.
 * adding combination in this helper as a workaround.
 *
 * @since 1.0.0
 *
 * @param {string} str The string to decode.
 * @return {string} Decoded HTML entity.
 */
export const decodeHTMLEntity = ( str ) => {
	if ( ! str ) {
		return '';
	}

	const decoded = str
		.replace( /&#(\d+);/g, function ( match, dec ) {
			return String.fromCharCode( dec );
		} )
		.replace( /(\\)/g, '' );

	return unescape( decoded );
};
