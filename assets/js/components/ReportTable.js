/**
 * Report Table component.
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
import classnames from 'classnames';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import { get } from 'lodash';

/**
 * Internal dependencies.
 */
import GatheringDataNotice from './GatheringDataNotice';

export default function ReportTable( {
	rows,
	columns,
	className,
	limit,
	zeroState: ZeroState,
	gatheringData = false,
} ) {
	invariant( Array.isArray( rows ), 'rows must be an array.' );
	invariant( Array.isArray( columns ), 'columns must be an array.' );
	columns.forEach( ( { Component, field = null } ) => {
		invariant(
			Component || field !== null,
			'each column must define a Component and/or a field.'
		);
	} );
	invariant(
		Number.isInteger( limit ) || limit === undefined,
		'limit must be an integer, if provided.'
	);
	const mobileColumns = columns.filter( ( col ) => ! col.hideOnMobile );

	return (
		<div
			className={ classnames(
				'googlesitekit-table',
				'googlesitekit-table--with-list',
				{ 'googlesitekit-table--gathering-data': gatheringData },
				className
			) }
		>
			<table
				className={ classnames(
					'googlesitekit-table__wrapper',
					`googlesitekit-table__wrapper--${ columns.length }-col`,
					`googlesitekit-table__wrapper--mobile-${ mobileColumns.length }-col`
				) }
			>
				<thead className="googlesitekit-table__head">
					<tr className="googlesitekit-table__head-row">
						{ columns.map(
							(
								{
									title,
									description,
									primary,
									hideOnMobile,
									className: columnClassName,
									badge,
								},
								colIndex
							) => (
								<th
									className={ classnames(
										'googlesitekit-table__head-item',
										{
											'googlesitekit-table__head-item--primary':
												primary,
										},
										{ 'hidden-on-mobile': hideOnMobile },
										columnClassName
									) }
									data-tooltip={ description }
									key={ `googlesitekit-table__head-row-${ colIndex }` }
								>
									{ title }
									{ badge }
								</th>
							)
						) }
					</tr>
				</thead>

				<tbody className="googlesitekit-table__body">
					{ gatheringData && (
						<tr className="googlesitekit-table__body-row googlesitekit-table__body-row--no-data">
							<td
								className="googlesitekit-table__body-item"
								colSpan={ columns.length }
							>
								<GatheringDataNotice />
							</td>
						</tr>
					) }
					{ ! gatheringData && ! rows?.length && ZeroState && (
						<tr className="googlesitekit-table__body-row googlesitekit-table__body-row--no-data">
							<td
								className="googlesitekit-table__body-item"
								colSpan={ columns.length }
							>
								<ZeroState />
							</td>
						</tr>
					) }

					{ ! gatheringData &&
						rows.slice( 0, limit ).map( ( row, rowIndex ) => (
							<tr
								className="googlesitekit-table__body-row"
								key={ `googlesitekit-table__body-row-${ rowIndex }` }
							>
								{ columns.map(
									(
										{
											Component,
											field,
											hideOnMobile,
											className: columnClassName,
										},
										colIndex
									) => {
										const fieldValue =
											field !== undefined
												? get( row, field )
												: undefined;
										return (
											<td
												key={ `googlesitekit-table__body-item-${ colIndex }` }
												className={ classnames(
													'googlesitekit-table__body-item',
													{
														'hidden-on-mobile':
															hideOnMobile,
													},
													columnClassName
												) }
											>
												<div className="googlesitekit-table__body-item-content">
													{ Component && (
														<Component
															row={ row }
															fieldValue={
																fieldValue
															}
														/>
													) }
													{ ! Component &&
														fieldValue }
												</div>
											</td>
										);
									}
								) }
							</tr>
						) ) }
				</tbody>
			</table>
		</div>
	);
}

ReportTable.propTypes = {
	rows: PropTypes.arrayOf(
		PropTypes.oneOfType( [ PropTypes.array, PropTypes.object ] )
	).isRequired,
	columns: PropTypes.arrayOf(
		PropTypes.shape( {
			title: PropTypes.string,
			description: PropTypes.string,
			primary: PropTypes.bool,
			className: PropTypes.string,
			field: PropTypes.string,
			hideOnMobile: PropTypes.bool,
			Component: PropTypes.componentType,
			badge: PropTypes.node,
		} )
	).isRequired,
	className: PropTypes.string,
	limit: PropTypes.number,
	zeroState: PropTypes.func,
	gatheringData: PropTypes.bool,
};
