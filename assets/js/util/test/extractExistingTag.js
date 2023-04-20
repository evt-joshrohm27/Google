/**
 * `extractExistingTag` tests.
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
 * Internal dependencies
 */
import { extractExistingTag } from '../tag';
import { default as adsenseTagMatchers } from '../../modules/adsense/util/tag-matchers';
import { default as analyticsTagMatchers } from '../../modules/analytics/util/tag-matchers';
import { tagMatchers as tagmanagerTagMatchers } from '../../modules/tagmanager/util';

const valuesToTest = [
	[
		"<script> window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date; ga('create', 'UA-XXXXX-Y', 'auto'); ga('send', 'pageview'); </script><script async src='https://www.google-analytics.com/analytics.js'></script>",
		analyticsTagMatchers,
		'UA-XXXXX-Y',
	],
	[
		"<script> (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){ (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o), m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', 'UA-XXXXX-Y', 'auto'); ga('send', 'pageview'); </script>",
		analyticsTagMatchers,
		'UA-XXXXX-Y',
	],
	[
		'<meta charset="UTF-8"><title>Site Kit for WordPress</title><link rel="dns-prefetch" href="//fonts.googleapis.com"></link>',
		analyticsTagMatchers,
		false,
	],
	[
		'<meta charset="UTF-8"><title>Site Kit for WordPress</title><link rel="dns-prefetch" href="//fonts.googleapis.com"></link>',
		adsenseTagMatchers,
		false,
	],
	[
		'<script data-ad-client="ca-pub-1234567890" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
		adsenseTagMatchers,
		'ca-pub-1234567890',
	],
	[
		'<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" async data-ad-client="ca-pub-1234567890"></script>',
		adsenseTagMatchers,
		'ca-pub-1234567890',
	],
	[
		'<script async src="http://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script> <script> (adsbygoogle = window.adsbygoogle || []).push({ google_ad_client: "ca-pub-123456789", enable_page_level_ads: true }); </script>',
		adsenseTagMatchers,
		'ca-pub-123456789',
	],
	[
		"<script>(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-12345-1', 'auto');ga('send', 'pageview');</script>",
		analyticsTagMatchers,
		'UA-12345-1',
	],
	[
		'<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX"></script>',
		tagmanagerTagMatchers,
		'GTM-XXXXXXX',
	],
	[
		'<amp-analytics config="https://www.googletagmanager.com/amp.json?id=GTM-XXXXXXX" data-credentials="include" class="i-amphtml-element i-amphtml-layout-fixed i-amphtml-layout-size-defined i-amphtml-layout" i-amphtml-layout="fixed" aria-hidden="true" style="width: 1px; height: 1px;" hidden=""></amp-analytics>',
		tagmanagerTagMatchers,
		'GTM-XXXXXXX',
	],
	[
		'<meta charset="UTF-8"><title>Site Kit for WordPress</title><link rel="dns-prefetch" href="//fonts.googleapis.com"></link>',
		tagmanagerTagMatchers,
		false,
	],
	[
		[
			"<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':",
			"new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],",
			"j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=",
			"'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);",
			"})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>",
		].join( '\n' ),
		tagmanagerTagMatchers,
		'GTM-XXXXXXX',
	],
	[
		[
			'<script data-cfasync="false">//<![CDATA[',
			"(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':",
			"new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],",
			"j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=",
			"'//www.googletagmanager.com/gtm.'+'js?id='+i+dl;f.parentNode.insertBefore(j,f);",
			"})(window,document,'script','dataLayer','GTM-XXXXXXX');//]]>",
			'</script>',
		].join( '\n' ),
		tagmanagerTagMatchers,
		'GTM-XXXXXXX',
	],
];

describe( 'extractTag', () => {
	it.each( valuesToTest )(
		'for HTML %s and module %s should find tag %s',
		( html, tagMatchers, expected ) => {
			expect( extractExistingTag( html, tagMatchers ) ).toStrictEqual(
				expected
			);
		}
	);
} );
