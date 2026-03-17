// ISO 3166-1 numeric -> alpha-2 (lowercase) mapping
// Used to match world-atlas TopoJSON features to @svg-maps/world country IDs
export const numericToAlpha2 = {
  '004': 'af', // Afghanistan
  '008': 'al', // Albania
  '010': 'aq', // Antarctica
  '012': 'dz', // Algeria
  '016': 'as', // American Samoa
  '020': 'ad', // Andorra
  '024': 'ao', // Angola
  '028': 'ag', // Antigua and Barbuda
  '031': 'az', // Azerbaijan
  '032': 'ar', // Argentina
  '036': 'au', // Australia
  '040': 'at', // Austria
  '044': 'bs', // Bahamas
  '048': 'bh', // Bahrain
  '050': 'bd', // Bangladesh
  '051': 'am', // Armenia
  '052': 'bb', // Barbados
  '056': 'be', // Belgium
  '060': 'bm', // Bermuda
  '064': 'bt', // Bhutan
  '068': 'bo', // Bolivia
  '070': 'ba', // Bosnia and Herzegovina
  '072': 'bw', // Botswana
  '076': 'br', // Brazil
  '084': 'bz', // Belize
  '090': 'sb', // Solomon Islands
  '092': 'vg', // British Virgin Islands
  '096': 'bn', // Brunei
  '100': 'bg', // Bulgaria
  '104': 'mm', // Myanmar
  '108': 'bi', // Burundi
  '112': 'by', // Belarus
  '116': 'kh', // Cambodia
  '120': 'cm', // Cameroon
  '124': 'ca', // Canada
  '132': 'cv', // Cabo Verde
  '136': 'ky', // Cayman Islands
  '140': 'cf', // Central African Republic
  '144': 'lk', // Sri Lanka
  '148': 'td', // Chad
  '152': 'cl', // Chile
  '156': 'cn', // China
  '158': 'tw', // Taiwan
  '162': 'cx', // Christmas Island
  '166': 'cc', // Cocos Islands
  '170': 'co', // Colombia
  '174': 'km', // Comoros
  '175': 'yt', // Mayotte
  '178': 'cg', // Congo
  '180': 'cd', // DR Congo
  '184': 'ck', // Cook Islands
  '188': 'cr', // Costa Rica
  '191': 'hr', // Croatia
  '192': 'cu', // Cuba
  '196': 'cy', // Cyprus
  '203': 'cz', // Czechia
  '204': 'bj', // Benin
  '208': 'dk', // Denmark
  '212': 'dm', // Dominica
  '214': 'do', // Dominican Republic
  '218': 'ec', // Ecuador
  '222': 'sv', // El Salvador
  '226': 'gq', // Equatorial Guinea
  '231': 'et', // Ethiopia
  '232': 'er', // Eritrea
  '233': 'ee', // Estonia
  '234': 'fo', // Faroe Islands
  '238': 'fk', // Falkland Islands
  '242': 'fj', // Fiji
  '246': 'fi', // Finland
  '250': 'fr', // France
  '254': 'gf', // French Guiana
  '258': 'pf', // French Polynesia
  '260': 'tf', // French Southern Territories
  '262': 'dj', // Djibouti
  '266': 'ga', // Gabon
  '268': 'ge', // Georgia
  '270': 'gm', // Gambia
  '275': 'ps', // Palestine
  '276': 'de', // Germany
  '288': 'gh', // Ghana
  '292': 'gi', // Gibraltar
  '296': 'ki', // Kiribati
  '300': 'gr', // Greece
  '304': 'gl', // Greenland
  '308': 'gd', // Grenada
  '312': 'gp', // Guadeloupe
  '316': 'gu', // Guam
  '320': 'gt', // Guatemala
  '324': 'gn', // Guinea
  '328': 'gy', // Guyana
  '332': 'ht', // Haiti
  '336': 'va', // Vatican City
  '340': 'hn', // Honduras
  '344': 'hk', // Hong Kong
  '348': 'hu', // Hungary
  '352': 'is', // Iceland
  '356': 'in', // India
  '360': 'id', // Indonesia
  '364': 'ir', // Iran
  '368': 'iq', // Iraq
  '372': 'ie', // Ireland
  '376': 'il', // Israel
  '380': 'it', // Italy
  '384': 'ci', // Ivory Coast
  '388': 'jm', // Jamaica
  '392': 'jp', // Japan
  '398': 'kz', // Kazakhstan
  '400': 'jo', // Jordan
  '404': 'ke', // Kenya
  '408': 'kp', // North Korea
  '410': 'kr', // South Korea
  '414': 'kw', // Kuwait
  '417': 'kg', // Kyrgyzstan
  '418': 'la', // Laos
  '422': 'lb', // Lebanon
  '426': 'ls', // Lesotho
  '428': 'lv', // Latvia
  '430': 'lr', // Liberia
  '434': 'ly', // Libya
  '438': 'li', // Liechtenstein
  '440': 'lt', // Lithuania
  '442': 'lu', // Luxembourg
  '446': 'mo', // Macao
  '450': 'mg', // Madagascar
  '454': 'mw', // Malawi
  '458': 'my', // Malaysia
  '462': 'mv', // Maldives
  '466': 'ml', // Mali
  '470': 'mt', // Malta
  '474': 'mq', // Martinique
  '478': 'mr', // Mauritania
  '480': 'mu', // Mauritius
  '484': 'mx', // Mexico
  '492': 'mc', // Monaco
  '496': 'mn', // Mongolia
  '498': 'md', // Moldova
  '499': 'me', // Montenegro
  '500': 'ms', // Montserrat
  '504': 'ma', // Morocco
  '508': 'mz', // Mozambique
  '512': 'om', // Oman
  '516': 'na', // Namibia
  '520': 'nr', // Nauru
  '524': 'np', // Nepal
  '528': 'nl', // Netherlands
  '531': 'cw', // Curacao
  '533': 'aw', // Aruba
  '534': 'sx', // Sint Maarten
  '540': 'nc', // New Caledonia
  '548': 'vu', // Vanuatu
  '554': 'nz', // New Zealand
  '558': 'ni', // Nicaragua
  '562': 'ne', // Niger
  '566': 'ng', // Nigeria
  '570': 'nu', // Niue
  '574': 'nf', // Norfolk Island
  '578': 'no', // Norway
  '580': 'mp', // Northern Mariana Islands
  '583': 'fm', // Micronesia
  '584': 'mh', // Marshall Islands
  '585': 'pw', // Palau
  '586': 'pk', // Pakistan
  '591': 'pa', // Panama
  '598': 'pg', // Papua New Guinea
  '600': 'py', // Paraguay
  '604': 'pe', // Peru
  '608': 'ph', // Philippines
  '612': 'pn', // Pitcairn Islands
  '616': 'pl', // Poland
  '620': 'pt', // Portugal
  '624': 'gw', // Guinea-Bissau
  '626': 'tl', // Timor-Leste
  '630': 'pr', // Puerto Rico
  '634': 'qa', // Qatar
  '638': 're', // Reunion
  '642': 'ro', // Romania
  '643': 'ru', // Russia
  '646': 'rw', // Rwanda
  '652': 'bl', // Saint Barthelemy
  '654': 'sh', // Saint Helena
  '659': 'kn', // Saint Kitts and Nevis
  '660': 'ai', // Anguilla
  '662': 'lc', // Saint Lucia
  '663': 'mf', // Saint Martin
  '666': 'pm', // Saint Pierre and Miquelon
  '670': 'vc', // Saint Vincent
  '674': 'sm', // San Marino
  '678': 'st', // Sao Tome and Principe
  '682': 'sa', // Saudi Arabia
  '686': 'sn', // Senegal
  '688': 'rs', // Serbia
  '690': 'sc', // Seychelles
  '694': 'sl', // Sierra Leone
  '702': 'sg', // Singapore
  '703': 'sk', // Slovakia
  '704': 'vn', // Vietnam
  '705': 'si', // Slovenia
  '706': 'so', // Somalia
  '710': 'za', // South Africa
  '716': 'zw', // Zimbabwe
  '724': 'es', // Spain
  '728': 'ss', // South Sudan
  '729': 'sd', // Sudan
  '732': 'eh', // Western Sahara
  '740': 'sr', // Suriname
  '744': 'sj', // Svalbard
  '748': 'sz', // Eswatini
  '752': 'se', // Sweden
  '756': 'ch', // Switzerland
  '760': 'sy', // Syria
  '762': 'tj', // Tajikistan
  '764': 'th', // Thailand
  '768': 'tg', // Togo
  '772': 'tk', // Tokelau
  '776': 'to', // Tonga
  '780': 'tt', // Trinidad and Tobago
  '784': 'ae', // United Arab Emirates
  '788': 'tn', // Tunisia
  '792': 'tr', // Turkey
  '795': 'tm', // Turkmenistan
  '796': 'tc', // Turks and Caicos
  '798': 'tv', // Tuvalu
  '800': 'ug', // Uganda
  '804': 'ua', // Ukraine
  '807': 'mk', // North Macedonia
  '818': 'eg', // Egypt
  '826': 'gb', // United Kingdom
  '831': 'gg', // Guernsey
  '832': 'je', // Jersey
  '833': 'im', // Isle of Man
  '834': 'tz', // Tanzania
  '840': 'us', // United States
  '850': 'vi', // US Virgin Islands
  '854': 'bf', // Burkina Faso
  '858': 'uy', // Uruguay
  '860': 'uz', // Uzbekistan
  '862': 've', // Venezuela
  '876': 'wf', // Wallis and Futuna
  '882': 'ws', // Samoa
  '887': 'ye', // Yemen
  '894': 'zm', // Zambia
  // Kosovo (non-standard, used by Natural Earth / world-atlas)
  '-99': 'xk',
}

// Reverse lookup: alpha-2 -> numeric
export const alpha2ToNumeric = Object.fromEntries(
  Object.entries(numericToAlpha2).map(([num, alpha]) => [alpha, num])
)
