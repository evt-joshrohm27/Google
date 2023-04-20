/**
 * WordPress dependencies
 */
import {
	activatePlugin,
	createURL,
	visitAdminPage,
} from '@wordpress/e2e-test-utils';

/**
 * Internal dependencies
 */
import {
	setSiteVerification,
	setSearchConsoleProperty,
	useRequestInterception,
	deactivateUtilityPlugins,
} from '../../utils';

describe( 'Site Kit dashboard post search', () => {
	beforeAll( async () => {
		await activatePlugin( 'e2e-tests-proxy-auth-plugin' );
		await setSiteVerification();
		await setSearchConsoleProperty();

		await page.setRequestInterception( true );
		useRequestInterception( ( request ) => {
			if (
				request
					.url()
					.match(
						'google-site-kit/v1/modules/search-console/data/searchanalytics'
					)
			) {
				request.respond( { status: 200, body: JSON.stringify( [] ) } );
			} else if (
				request
					.url()
					.match(
						'google-site-kit/v1/modules/pagespeed-insights/data/pagespeed'
					)
			) {
				request.respond( { status: 200, body: JSON.stringify( {} ) } );
			} else {
				request.continue();
			}
		} );
	} );

	afterAll( async () => {
		await deactivateUtilityPlugins();
	} );

	beforeEach( async () => {
		await visitAdminPage( 'admin.php', 'page=googlesitekit-dashboard' );
	} );

	it( 'displays results when searching with a post title, and loads the details page when clicking View Data', async () => {
		const postSearcher = await page.$( '.googlesitekit-entity-search' );
		await page.click( '.googlesitekit-entity-search .mdc-button' );
		await page.waitForSelector( '.googlesitekit-entity-search__actions' );

		await expect( postSearcher ).toFill( 'input', 'hello' );
		await page.waitForResponse( ( res ) =>
			res.url().match( 'core/search/data/entity-search' )
		);

		// Ensure expected options appear.
		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: /hello world/i,
		} );
		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: /hello solar system/i,
		} );
		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: /hello universe/i,
		} );

		// Select the post.
		await expect( postSearcher ).toClick( '.autocomplete__option', {
			text: /hello world/i,
		} );

		await page.waitForNavigation();

		// Search input becomes the post title
		await page.waitForSelector( '.googlesitekit-entity-search' );
		const entitySearcher = await page.$( '.googlesitekit-entity-search' );
		expect(
			await entitySearcher.$eval( 'input', ( el ) => el.value )
		).toEqual( 'Hello world!' );

		await expect( page ).toMatchElement(
			'.googlesitekit-entity-header__back',
			{
				text: /back to dashboard/i,
			}
		);
		await expect( page ).toMatchElement(
			'.googlesitekit-entity-header__details p',
			{
				text: 'Hello world!',
			}
		);
	} );

	it( 'displays results when searching with a URL, and loads the details page when clicking View Data', async () => {
		const postSearcher = await page.$( '.googlesitekit-entity-search' );
		await page.click( '.googlesitekit-entity-search .mdc-button' );
		await page.waitForSelector( '.googlesitekit-entity-search__actions' );

		await expect( postSearcher ).toFill(
			'input',
			createURL( 'hello-world' )
		);
		await page.waitForResponse( ( res ) =>
			res.url().match( 'core/search/data/entity-search' )
		);

		// Ensure expected options appear.
		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: /hello world/i,
		} );
		// Ensure no other options are displayed.
		expect( await postSearcher.$$( '.autocomplete__option' ) ).toHaveLength(
			1
		);

		// Select the post.
		await expect( postSearcher ).toClick( '.autocomplete__option', {
			text: /hello world/i,
		} );

		page.waitForNavigation();

		await page.waitForSelector( '.googlesitekit-entity-search' );
		const entitySearcher = await page.$( '.googlesitekit-entity-search' );

		// Search input becomes the post title
		expect(
			await entitySearcher.$eval( 'input', ( el ) => el.value )
		).toEqual( 'Hello world!' );

		await expect( page ).toMatchElement(
			'.googlesitekit-entity-header__back',
			{
				text: /back to dashboard/i,
			}
		);
		await expect( page ).toMatchElement(
			'.googlesitekit-entity-header__details p',
			{
				text: 'Hello world!',
			}
		);
	} );

	it( 'displays "No results found" when searching by title if no post is found', async () => {
		const postSearcher = await page.$( '.googlesitekit-entity-search' );
		await page.click( '.googlesitekit-entity-search .mdc-button' );
		await page.waitForSelector( '.googlesitekit-entity-search__actions' );

		await expect( postSearcher ).toFill( 'input', 'non-existent title' );
		await page.waitForResponse( ( res ) =>
			res.url().match( 'core/search/data/entity-search' )
		);

		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: /no results found/i,
		} );

		// Ensure no other options are displayed.
		expect( await postSearcher.$$( '.autocomplete__option' ) ).toHaveLength(
			1
		);
	} );

	it( 'displays "No results found" when searching by URL if no post is found', async () => {
		const postSearcher = await page.$( '.googlesitekit-entity-search' );
		await page.click( '.googlesitekit-entity-search .mdc-button' );
		await page.waitForSelector( '.googlesitekit-entity-search__actions' );

		await expect( postSearcher ).toFill(
			'input',
			createURL( 'non-existent' )
		);
		await page.waitForResponse( ( res ) =>
			res.url().match( 'core/search/data/entity-search' )
		);

		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: /no results found/i,
		} );

		// Ensure no other options are displayed.
		expect( await postSearcher.$$( '.autocomplete__option' ) ).toHaveLength(
			1
		);
	} );

	it( 'works with post titles containing special characters', async () => {
		const TITLE_SPECIAL_CHARACTERS = 'Hello Spéçïåł čhāràćtęrß!';
		const postSearcher = await page.$( '.googlesitekit-entity-search' );
		await page.click( '.googlesitekit-entity-search .mdc-button' );
		await page.waitForSelector( '.googlesitekit-entity-search__actions' );

		await expect( postSearcher ).toFill( 'input', 'Spéçïåł' );
		await page.waitForResponse( ( res ) =>
			res.url().match( 'core/search/data/entity-search' )
		);

		// Ensure expected options appear.
		await expect( postSearcher ).toMatchElement( '.autocomplete__option', {
			text: TITLE_SPECIAL_CHARACTERS,
		} );
		// Ensure no other options are displayed.
		expect( await postSearcher.$$( '.autocomplete__option' ) ).toHaveLength(
			1
		);

		// Select the post.
		await expect( postSearcher ).toClick( '.autocomplete__option', {
			text: TITLE_SPECIAL_CHARACTERS,
		} );

		await page.waitForNavigation();

		await page.waitForSelector( '.googlesitekit-entity-search' );
		const entitySearcher = await page.$( '.googlesitekit-entity-search' );

		// Search input becomes the post title
		expect(
			await entitySearcher.$eval( 'input', ( el ) => el.value )
		).toEqual( TITLE_SPECIAL_CHARACTERS );

		await expect( page ).toMatchElement(
			'.googlesitekit-entity-header__back',
			{
				text: /back to dashboard/i,
			}
		);
		await expect( page ).toMatchElement(
			'.googlesitekit-entity-header__details p',
			{
				text: TITLE_SPECIAL_CHARACTERS,
			}
		);
	} );
} );
