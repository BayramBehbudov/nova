/* NOVA — catalogue and site copy.
 * Pure data. No DOM, no logic, no side effects beyond assigning window.NOVA.data.
 * Loaded before store.js / ui.js / motion.js / page-*.js.
 */
window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Brand
   * ------------------------------------------------------------------ */
  var brand = {
    name: 'NOVA',
    tagline: 'Sound built to be listened to, not measured.',
    story: 'NOVA started in 2016 in a converted print works, with four engineers who were tired of gear that measured well and moved no one. Every product since has been voiced by ear first and confirmed on the bench second. We build in small runs, publish our tolerances, and service what we sell for as long as we sell it.',
    founded: 2016,
    stats: [
      { label: 'Products', value: 120, suffix: '+' },
      { label: 'Customers', value: 48000, suffix: '+' },
      { label: 'Countries', value: 37, suffix: '' },
      { label: 'Avg. rating', value: 4.9, suffix: '/5' }
    ],
    partners: [
      'Meridian Labs',
      'Aster Acoustics',
      'Northline Studios',
      'Kestrel Audio',
      'Verona Hi-Fi',
      'Halcyon Records',
      'Beacon & Field',
      'Tanner Broadcast'
    ]
  };

  /* ---------------------------------------------------------------------
   * Categories — exactly 6. product.art always matches category.art.
   * ------------------------------------------------------------------ */
  var categories = [
    {
      slug: 'headphones',
      name: 'Headphones',
      tagline: 'Over-ear cans for the long session',
      blurb: 'Open, closed and planar designs voiced for hours of listening rather than a showroom minute.',
      art: 'headphone',
      hue: 32
    },
    {
      slug: 'earbuds',
      name: 'Earbuds',
      tagline: 'Pocket-sized, no apologies',
      blurb: 'True wireless sets that keep the detail intact once you leave the listening room.',
      art: 'earbuds',
      hue: 190
    },
    {
      slug: 'speakers',
      name: 'Speakers',
      tagline: 'Rooms filled, neighbours considered',
      blurb: 'From a desk monitor you can carry to a floorstander that moves the floor with it.',
      art: 'speaker',
      hue: 268
    },
    {
      slug: 'turntables',
      name: 'Turntables',
      tagline: 'Vinyl, handled properly',
      blurb: 'Belt and direct drive decks with plinths heavy enough to ignore the room around them.',
      art: 'turntable',
      hue: 14
    },
    {
      slug: 'microphones',
      name: 'Microphones',
      tagline: 'Capture before correction',
      blurb: 'Condenser, dynamic and ribbon capsules tuned for voices that have to carry a record.',
      art: 'mic',
      hue: 96
    },
    {
      slug: 'amplifiers',
      name: 'Amplifiers',
      tagline: 'Power with a point of view',
      blurb: 'Tube, class A and portable amplification that gives your headphones and speakers room to breathe.',
      art: 'amp',
      hue: 220
    }
  ];

  /* ---------------------------------------------------------------------
   * Products — exactly 24, four per category.
   * ------------------------------------------------------------------ */
  var products = [
    /* ---- Headphones ------------------------------------------------- */
    {
      id: 'nv-001',
      slug: 'aurora-one',
      name: 'Aurora One',
      brand: 'NOVA',
      category: 'headphones',
      art: 'headphone',
      hue: 32,
      price: 349,
      oldPrice: 449,
      rating: 4.8,
      reviewCount: 214,
      badge: 'sale',
      colors: [
        { name: 'Midnight', hex: '#14141A' },
        { name: 'Sand', hex: '#D8CBB6' }
      ],
      blurb: 'Open-back clarity with a warm low end, built for the long session.',
      description: 'Aurora One pairs a 40 mm beryllium-coated driver with a vented acoustic chamber, so the stage stays wide and voices sit forward instead of behind the mix. The suspension headband spreads the weight across the crown, which keeps the clamp gentle across a full afternoon.',
      features: [
        'Open-back 40 mm beryllium driver',
        'Self-adjusting suspension headband',
        'Detachable braided copper cable',
        'Machined aluminium yokes'
      ],
      specs: [
        { label: 'Driver', value: '40 mm beryllium' },
        { label: 'Impedance', value: '32 ohm' },
        { label: 'Frequency response', value: '8 Hz - 40 kHz' },
        { label: 'Weight', value: '286 g' },
        { label: 'Connection', value: 'Wired, 3.5 mm and 6.35 mm' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 14,
      sku: 'NV-AUR-001',
      featured: true,
      isNew: false,
      releasedAt: '2026-03-11'
    },
    {
      id: 'nv-002',
      slug: 'halo-studio',
      name: 'Halo Studio',
      brand: 'NOVA',
      category: 'headphones',
      art: 'headphone',
      hue: 268,
      price: 599,
      oldPrice: null,
      rating: 4.9,
      reviewCount: 486,
      badge: 'bestseller',
      colors: [
        { name: 'Graphite', hex: '#1B1B20' },
        { name: 'Ivory', hex: '#F1EDE4' },
        { name: 'Cobalt', hex: '#23407A' }
      ],
      blurb: 'Closed-back reference monitoring with an honest, unflattering midrange.',
      description: 'Halo Studio is made for rooms where the truth matters more than the flattery. A sealed magnesium cup and a heavily damped 45 mm driver hold the midrange steady at output levels that make lesser monitors start editorialising.',
      features: [
        'Sealed magnesium cup, -28 dB isolation',
        '45 mm damped dynamic driver',
        'Coiled 3 m studio cable',
        'User-replaceable lambskin pads'
      ],
      specs: [
        { label: 'Driver', value: '45 mm dynamic' },
        { label: 'Impedance', value: '60 ohm' },
        { label: 'Frequency response', value: '5 Hz - 40 kHz' },
        { label: 'Isolation', value: '-28 dB passive' },
        { label: 'Weight', value: '340 g' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 8,
      sku: 'NV-HAL-002',
      featured: true,
      isNew: false,
      releasedAt: '2025-11-02'
    },
    {
      id: 'nv-003',
      slug: 'obsidian-pro',
      name: 'Obsidian Pro',
      brand: 'NOVA',
      category: 'headphones',
      art: 'headphone',
      hue: 210,
      price: 1290,
      oldPrice: null,
      rating: 4.7,
      reviewCount: 132,
      badge: null,
      colors: [
        { name: 'Obsidian', hex: '#0E0E12' },
        { name: 'Titanium', hex: '#9AA0A6' }
      ],
      blurb: 'Planar flagship with effortless dynamics at any listening level.',
      description: 'A 90 mm planar diaphragm moves as a single surface, so transients arrive without smear and the bass reads as texture rather than volume. The carbon arch and lambskin pads make 395 g feel considerably lighter than the number suggests.',
      features: [
        '90 mm planar magnetic diaphragm',
        'Hand-matched driver pairs',
        'Balanced 4.4 mm and single-ended cables',
        'Carbon fibre arch and hard case'
      ],
      specs: [
        { label: 'Driver', value: '90 mm planar magnetic' },
        { label: 'Impedance', value: '18 ohm' },
        { label: 'Sensitivity', value: '100 dB/mW' },
        { label: 'Frequency response', value: '6 Hz - 50 kHz' },
        { label: 'Weight', value: '395 g' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 5,
      sku: 'NV-OBS-003',
      featured: false,
      isNew: false,
      releasedAt: '2025-08-19'
    },
    {
      id: 'nv-004',
      slug: 'drift-air',
      name: 'Drift Air',
      brand: 'NOVA',
      category: 'headphones',
      art: 'headphone',
      hue: 12,
      price: 229,
      oldPrice: null,
      rating: 4.3,
      reviewCount: 78,
      badge: 'new',
      colors: [
        { name: 'Clay', hex: '#C36A4B' },
        { name: 'Slate', hex: '#3A3F46' },
        { name: 'Bone', hex: '#EDE7DC' }
      ],
      blurb: 'Everyday wireless with 60 hours of playback and adaptive noise control.',
      description: 'Drift Air quiets the commute without hollowing out the music, using a dual-mic array that resamples the cabin sixty times a second. Ten minutes on the charger returns eight hours of playback, which covers most of the ways a battery ruins a trip.',
      features: [
        '60 h battery, 10 min quick charge',
        'Adaptive noise cancelling',
        'Multipoint Bluetooth 5.4 with LDAC',
        'Flat-folding travel hinge'
      ],
      specs: [
        { label: 'Driver', value: '40 mm dynamic' },
        { label: 'Battery', value: '60 h with ANC off' },
        { label: 'Bluetooth', value: '5.4, LDAC and AAC' },
        { label: 'Charging', value: 'USB-C, 10 min = 8 h' },
        { label: 'Weight', value: '254 g' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 22,
      sku: 'NV-DRF-004',
      featured: false,
      isNew: true,
      releasedAt: '2026-05-28'
    },

    /* ---- Earbuds ---------------------------------------------------- */
    {
      id: 'nv-005',
      slug: 'lumen-buds',
      name: 'Lumen Buds',
      brand: 'NOVA',
      category: 'earbuds',
      art: 'earbuds',
      hue: 190,
      price: 179,
      oldPrice: 219,
      rating: 4.6,
      reviewCount: 341,
      badge: 'sale',
      colors: [
        { name: 'Frost', hex: '#E7EEF2' },
        { name: 'Ink', hex: '#161A20' },
        { name: 'Moss', hex: '#4A5B45' }
      ],
      blurb: 'True wireless that stages far wider than the shell has any right to.',
      description: 'Lumen Buds use a 10 mm bio-cellulose driver angled into the canal, which is why the image sits in front of you rather than between your ears. The case is machined aluminium and holds four extra charges without becoming a paperweight.',
      features: [
        '10 mm bio-cellulose driver',
        '8 h per bud, 32 h with case',
        'IPX5 sweat and rain resistance',
        'Four silicone tip sizes included'
      ],
      specs: [
        { label: 'Driver', value: '10 mm bio-cellulose' },
        { label: 'Battery', value: '8 h bud / 32 h total' },
        { label: 'Bluetooth', value: '5.3, aptX Adaptive' },
        { label: 'Water resistance', value: 'IPX5' },
        { label: 'Weight', value: '5.1 g per bud' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 30,
      sku: 'NV-LUM-005',
      featured: true,
      isNew: false,
      releasedAt: '2026-01-20'
    },
    {
      id: 'nv-006',
      slug: 'echo-mini',
      name: 'Echo Mini',
      brand: 'NOVA',
      category: 'earbuds',
      art: 'earbuds',
      hue: 150,
      price: 129,
      oldPrice: null,
      rating: 4.4,
      reviewCount: 612,
      badge: null,
      colors: [
        { name: 'Chalk', hex: '#F4F1EA' },
        { name: 'Charcoal', hex: '#20242A' }
      ],
      blurb: 'The smallest set we make, tuned to stay balanced at low volume.',
      description: 'Echo Mini exists for people who listen quietly and still want the bass line to arrive. A low-level compensation curve lifts the extremes below 60 dB, then steps out of the way as you turn it up.',
      features: [
        'Low-level listening compensation',
        '4.2 g shell, sits flush in the ear',
        '6 h per bud, 24 h with case',
        'Single-bud mono mode'
      ],
      specs: [
        { label: 'Driver', value: '7 mm dynamic' },
        { label: 'Battery', value: '6 h bud / 24 h total' },
        { label: 'Bluetooth', value: '5.3, AAC and SBC' },
        { label: 'Water resistance', value: 'IPX4' },
        { label: 'Weight', value: '4.2 g per bud' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 45,
      sku: 'NV-ECH-006',
      featured: false,
      isNew: false,
      releasedAt: '2025-06-30'
    },
    {
      id: 'nv-007',
      slug: 'pulse-sport',
      name: 'Pulse Sport',
      brand: 'NOVA',
      category: 'earbuds',
      art: 'earbuds',
      hue: 96,
      price: 149,
      oldPrice: null,
      rating: 4.2,
      reviewCount: 205,
      badge: 'new',
      colors: [
        { name: 'Signal', hex: '#C6F04B' },
        { name: 'Onyx', hex: '#121417' },
        { name: 'Coral', hex: '#E4634F' }
      ],
      blurb: 'Hooked earbuds that hold through a marathon and rinse clean after.',
      description: 'Pulse Sport locks in with a flexible titanium-cored ear hook that adapts to the ear rather than clamping it. The whole shell is rated IP67, so it survives both the run and the tap water afterwards.',
      features: [
        'Titanium-cored flexible ear hook',
        'IP67 rinseable housing',
        'Transparency mode for road running',
        '10 h per bud, 40 h with case'
      ],
      specs: [
        { label: 'Driver', value: '9 mm dynamic' },
        { label: 'Battery', value: '10 h bud / 40 h total' },
        { label: 'Bluetooth', value: '5.3, AAC' },
        { label: 'Water resistance', value: 'IP67' },
        { label: 'Weight', value: '7.4 g per bud' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 26,
      sku: 'NV-PLS-007',
      featured: false,
      isNew: true,
      releasedAt: '2026-06-04'
    },
    {
      id: 'nv-008',
      slug: 'nimbus-anc',
      name: 'Nimbus ANC',
      brand: 'NOVA',
      category: 'earbuds',
      art: 'earbuds',
      hue: 262,
      price: 259,
      oldPrice: 299,
      rating: 4.9,
      reviewCount: 388,
      badge: 'bestseller',
      colors: [
        { name: 'Storm', hex: '#2B3240' },
        { name: 'Pearl', hex: '#EFEDE8' }
      ],
      blurb: 'Our quietest earbuds, with cabin noise cut by up to 42 dB.',
      description: 'Nimbus ANC runs a feed-forward and feed-back pair on each bud and recalculates the cancellation curve every 12 microseconds. The result is a floor low enough that you can hold a conversation at a whisper on a full flight.',
      features: [
        'Up to -42 dB active cancellation',
        'Adaptive wind rejection',
        'Wireless charging case',
        'Six-mic array for calls'
      ],
      specs: [
        { label: 'Driver', value: '11 mm dual-layer' },
        { label: 'Cancellation', value: 'Up to -42 dB' },
        { label: 'Battery', value: '7 h bud / 28 h total' },
        { label: 'Bluetooth', value: '5.4, LDAC' },
        { label: 'Charging', value: 'USB-C and Qi wireless' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 0,
      sku: 'NV-NMB-008',
      featured: true,
      isNew: false,
      releasedAt: '2025-12-08'
    },

    /* ---- Speakers --------------------------------------------------- */
    {
      id: 'nv-009',
      slug: 'monolith-300',
      name: 'Monolith 300',
      brand: 'NOVA',
      category: 'speakers',
      art: 'speaker',
      hue: 268,
      price: 2400,
      oldPrice: null,
      rating: 4.9,
      reviewCount: 96,
      badge: 'bestseller',
      colors: [
        { name: 'Basalt', hex: '#1A1B1F' },
        { name: 'Walnut', hex: '#6B4A31' }
      ],
      blurb: 'A floorstander that loads a large room without shouting to do it.',
      description: 'Monolith 300 runs a three-way array in a braced 41 kg cabinet, with the bass drivers firing into a downward port that keeps the rear wall out of the argument. Placement is forgiving because the cabinet, not the room, sets the character.',
      features: [
        'Three-way array, twin 8 in bass drivers',
        '41 kg braced cabinet, downward port',
        'Real wood veneer, hand finished',
        'Bi-wire terminals with 10 mm posts'
      ],
      specs: [
        { label: 'Configuration', value: '3-way floorstanding' },
        { label: 'Drivers', value: '2 x 8 in, 5 in mid, 1 in tweeter' },
        { label: 'Frequency response', value: '28 Hz - 30 kHz' },
        { label: 'Sensitivity', value: '89 dB / 2.83 V' },
        { label: 'Weight', value: '41 kg each' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 3,
      sku: 'NV-MON-009',
      featured: true,
      isNew: false,
      releasedAt: '2025-09-15'
    },
    {
      id: 'nv-010',
      slug: 'orbit-mini',
      name: 'Orbit Mini',
      brand: 'NOVA',
      category: 'speakers',
      art: 'speaker',
      hue: 40,
      price: 59,
      oldPrice: null,
      rating: 4.1,
      reviewCount: 512,
      badge: null,
      colors: [
        { name: 'Fog', hex: '#D9D6CF' },
        { name: 'Night', hex: '#17181C' },
        { name: 'Rust', hex: '#A6533A' }
      ],
      blurb: 'Palm-sized portable speaker with 18 hours on a charge.',
      description: 'Orbit Mini fits in a coat pocket and still manages a passive radiator large enough to give kick drums a shape. It is the speaker for the kitchen, the balcony and the tent, and it is priced so losing one is annoying rather than tragic.',
      features: [
        '18 h battery on a single charge',
        'Passive radiator for real low end',
        'IP66 dust and jet resistant',
        'Pairs two units for stereo'
      ],
      specs: [
        { label: 'Driver', value: '52 mm full range' },
        { label: 'Output', value: '12 W RMS' },
        { label: 'Battery', value: '18 h at half volume' },
        { label: 'Bluetooth', value: '5.3, SBC and AAC' },
        { label: 'Water resistance', value: 'IP66' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 60,
      sku: 'NV-ORB-010',
      featured: false,
      isNew: false,
      releasedAt: '2025-04-22'
    },
    {
      id: 'nv-011',
      slug: 'solace-two',
      name: 'Solace Two',
      brand: 'NOVA',
      category: 'speakers',
      art: 'speaker',
      hue: 320,
      price: 899,
      oldPrice: 1050,
      rating: 4.7,
      reviewCount: 174,
      badge: 'sale',
      colors: [
        { name: 'Oyster', hex: '#E3DCD0' },
        { name: 'Deep Teal', hex: '#1E4B4E' }
      ],
      blurb: 'Standmount pair with a midrange that makes vocals feel physical.',
      description: 'Solace Two is a two-way standmount built around a paper-pulp midbass cone that has never needed replacing in our tuning room. It rewards a good amplifier and forgives a modest one, which is a harder balance than the spec sheet shows.',
      features: [
        'Two-way sealed standmount, sold as a pair',
        'Paper-pulp midbass cone',
        'Soft dome tweeter on a shallow waveguide',
        'Magnetic grilles included'
      ],
      specs: [
        { label: 'Configuration', value: '2-way sealed standmount' },
        { label: 'Drivers', value: '6.5 in midbass, 1 in dome' },
        { label: 'Frequency response', value: '45 Hz - 28 kHz' },
        { label: 'Sensitivity', value: '86 dB / 2.83 V' },
        { label: 'Weight', value: '9.2 kg each' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 11,
      sku: 'NV-SOL-011',
      featured: false,
      isNew: false,
      releasedAt: '2025-10-14'
    },
    {
      id: 'nv-012',
      slug: 'vantage-sub',
      name: 'Vantage Sub',
      brand: 'NOVA',
      category: 'speakers',
      art: 'speaker',
      hue: 6,
      price: 749,
      oldPrice: null,
      rating: 4.5,
      reviewCount: 63,
      badge: null,
      colors: [
        { name: 'Matte Black', hex: '#131316' },
        { name: 'Linen', hex: '#CFC7B8' }
      ],
      blurb: 'Sealed 10 inch subwoofer with room correction that runs in two minutes.',
      description: 'Vantage Sub is sealed rather than ported, which trades a little raw output for bass that starts and stops when the recording says so. The onboard sweep measures your room from the listening seat and stores four presets.',
      features: [
        'Sealed 10 in long-throw driver',
        '400 W class D amplifier',
        'Two minute room correction sweep',
        'Four storable placement presets'
      ],
      specs: [
        { label: 'Driver', value: '10 in long-throw, sealed' },
        { label: 'Amplifier', value: '400 W class D' },
        { label: 'Frequency response', value: '22 Hz - 200 Hz' },
        { label: 'Inputs', value: 'RCA, XLR, high level' },
        { label: 'Weight', value: '18.6 kg' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 9,
      sku: 'NV-VAN-012',
      featured: false,
      isNew: false,
      releasedAt: '2026-02-09'
    },

    /* ---- Turntables ------------------------------------------------- */
    {
      id: 'nv-013',
      slug: 'revolve-mk-ii',
      name: 'Revolve MK II',
      brand: 'NOVA',
      category: 'turntables',
      art: 'turntable',
      hue: 14,
      price: 1150,
      oldPrice: null,
      rating: 4.8,
      reviewCount: 88,
      badge: null,
      colors: [
        { name: 'Walnut', hex: '#6B4A31' },
        { name: 'Piano Black', hex: '#0F0F12' }
      ],
      blurb: 'Belt drive deck with a 6.2 kg platter that ignores the room.',
      description: 'Revolve MK II runs an isolated motor pod and a machined aluminium platter heavy enough to carry speed through a warped record. The carbon tonearm arrives pre-aligned with our own moving magnet cartridge fitted.',
      features: [
        'Isolated motor pod, silicone belt',
        '6.2 kg machined aluminium platter',
        'Carbon fibre tonearm, pre-aligned',
        'NOVA MM cartridge included'
      ],
      specs: [
        { label: 'Drive', value: 'Belt, isolated motor' },
        { label: 'Platter', value: '6.2 kg aluminium' },
        { label: 'Speeds', value: '33 and 45 rpm, electronic' },
        { label: 'Tonearm', value: '9 in carbon fibre' },
        { label: 'Wow and flutter', value: '0.08 percent' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 6,
      sku: 'NV-REV-013',
      featured: true,
      isNew: false,
      releasedAt: '2025-07-25'
    },
    {
      id: 'nv-014',
      slug: 'groove-classic',
      name: 'Groove Classic',
      brand: 'NOVA',
      category: 'turntables',
      art: 'turntable',
      hue: 36,
      price: 649,
      oldPrice: 799,
      rating: 4.6,
      reviewCount: 143,
      badge: 'sale',
      colors: [
        { name: 'Oak', hex: '#B08A5A' },
        { name: 'Ash Grey', hex: '#8E8F8B' }
      ],
      blurb: 'A first serious deck: set up in ten minutes, upgrade for years.',
      description: 'Groove Classic ships with the counterweight already balanced and the anti-skate set, so the first record plays inside ten minutes. The tonearm accepts any standard half-inch cartridge, which is where most owners spend their next upgrade.',
      features: [
        'Balanced and aligned at the factory',
        'Standard half-inch cartridge mount',
        'Switchable built-in phono stage',
        'Dust cover with damped hinges'
      ],
      specs: [
        { label: 'Drive', value: 'Belt, DC motor' },
        { label: 'Platter', value: '2.4 kg alloy' },
        { label: 'Speeds', value: '33 and 45 rpm' },
        { label: 'Tonearm', value: '8.6 in aluminium' },
        { label: 'Phono stage', value: 'Built in, switchable' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 12,
      sku: 'NV-GRV-014',
      featured: false,
      isNew: false,
      releasedAt: '2025-05-18'
    },
    {
      id: 'nv-015',
      slug: 'platter-one',
      name: 'Platter One',
      brand: 'NOVA',
      category: 'turntables',
      art: 'turntable',
      hue: 24,
      price: 399,
      oldPrice: null,
      rating: 4.3,
      reviewCount: 57,
      badge: null,
      colors: [
        { name: 'Cream', hex: '#E8E1D3' },
        { name: 'Forest', hex: '#2F4436' }
      ],
      blurb: 'Compact deck with USB out, for playing and archiving a collection.',
      description: 'Platter One plays through your system and records to a laptop over USB at 24 bit, which is enough resolution to keep the surface noise honest. The plinth is a single moulded piece, so there is nothing inside to rattle loose.',
      features: [
        '24 bit USB recording output',
        'Single-piece damped plinth',
        'Auto-stop at the run-out groove',
        'Replaceable stylus, stocked long term'
      ],
      specs: [
        { label: 'Drive', value: 'Belt, AC synchronous' },
        { label: 'Platter', value: '1.6 kg alloy' },
        { label: 'Speeds', value: '33, 45 and 78 rpm' },
        { label: 'Outputs', value: 'RCA line, USB-B' },
        { label: 'Recording', value: '24 bit / 96 kHz' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 18,
      sku: 'NV-PLT-015',
      featured: false,
      isNew: false,
      releasedAt: '2025-03-02'
    },
    {
      id: 'nv-016',
      slug: 'arc-belt',
      name: 'Arc Belt',
      brand: 'NOVA',
      category: 'turntables',
      art: 'turntable',
      hue: 340,
      price: 1890,
      oldPrice: null,
      rating: 4.9,
      reviewCount: 41,
      badge: 'new',
      colors: [
        { name: 'Anthracite', hex: '#232529' },
        { name: 'Bronze', hex: '#8A6A3C' }
      ],
      blurb: 'Reference belt drive on a magnetically suspended sub-chassis.',
      description: 'Arc Belt floats its sub-chassis on opposed magnets, so footsteps on a suspended floor never reach the stylus. Speed is held by an optical encoder that corrects 900 times per revolution without ever hunting audibly.',
      features: [
        'Magnetically suspended sub-chassis',
        'Optical speed encoder, 900 corrections per turn',
        '10 in unipivot tonearm',
        'Machined acrylic and steel platter'
      ],
      specs: [
        { label: 'Drive', value: 'Belt, encoder corrected' },
        { label: 'Platter', value: '8.1 kg acrylic and steel' },
        { label: 'Speeds', value: '33, 45 and 78 rpm' },
        { label: 'Tonearm', value: '10 in unipivot' },
        { label: 'Wow and flutter', value: '0.04 percent' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 4,
      sku: 'NV-ARC-016',
      featured: false,
      isNew: true,
      releasedAt: '2026-05-06'
    },

    /* ---- Microphones ------------------------------------------------ */
    {
      id: 'nv-017',
      slug: 'verse-c1',
      name: 'Verse C1',
      brand: 'NOVA',
      category: 'microphones',
      art: 'mic',
      hue: 96,
      price: 429,
      oldPrice: null,
      rating: 4.7,
      reviewCount: 168,
      badge: null,
      colors: [
        { name: 'Satin Nickel', hex: '#B7BAB8' },
        { name: 'Matte Black', hex: '#15161A' }
      ],
      blurb: 'Large diaphragm condenser with a gentle presence lift for vocals.',
      description: 'Verse C1 uses a hand-tensioned one inch capsule with a broad, unfussy lift around 6 kHz that flatters most voices without adding sibilance. The transformerless output stays clean down to a whisper and takes 138 dB before it complains.',
      features: [
        'One inch hand-tensioned capsule',
        'Transformerless output stage',
        'Switchable -10 dB pad and 80 Hz filter',
        'Shockmount and case included'
      ],
      specs: [
        { label: 'Capsule', value: '1 in gold-sputtered condenser' },
        { label: 'Pattern', value: 'Cardioid' },
        { label: 'Frequency response', value: '20 Hz - 20 kHz' },
        { label: 'Max SPL', value: '138 dB' },
        { label: 'Self noise', value: '7 dBA' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 15,
      sku: 'NV-VRS-017',
      featured: true,
      isNew: false,
      releasedAt: '2025-09-01'
    },
    {
      id: 'nv-018',
      slug: 'field-dyn',
      name: 'Field Dyn',
      brand: 'NOVA',
      category: 'microphones',
      art: 'mic',
      hue: 120,
      price: 219,
      oldPrice: 269,
      rating: 4.5,
      reviewCount: 231,
      badge: 'sale',
      colors: [
        { name: 'Olive', hex: '#57614A' },
        { name: 'Jet', hex: '#101114' }
      ],
      blurb: 'Broadcast dynamic that rejects the room you happen to be stuck in.',
      description: 'Field Dyn is the microphone for untreated rooms, with a tight cardioid pattern and an internal air suspension that swallows desk knocks. It needs a little more gain than a condenser and gives back a great deal less room in exchange.',
      features: [
        'Tight cardioid, strong off-axis rejection',
        'Internal air-suspension shockmount',
        'Integrated pop filter',
        'Steel body, replaceable grille'
      ],
      specs: [
        { label: 'Capsule', value: 'Dynamic, moving coil' },
        { label: 'Pattern', value: 'Cardioid' },
        { label: 'Frequency response', value: '50 Hz - 16 kHz' },
        { label: 'Max SPL', value: '148 dB' },
        { label: 'Output', value: 'XLR balanced, 300 ohm' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 24,
      sku: 'NV-FLD-018',
      featured: false,
      isNew: false,
      releasedAt: '2025-02-11'
    },
    {
      id: 'nv-019',
      slug: 'chorus-usb',
      name: 'Chorus USB',
      brand: 'NOVA',
      category: 'microphones',
      art: 'mic',
      hue: 168,
      price: 139,
      oldPrice: null,
      rating: 4.2,
      reviewCount: 604,
      badge: 'bestseller',
      colors: [
        { name: 'Silver', hex: '#C9CCCE' },
        { name: 'Midnight', hex: '#16181D' }
      ],
      blurb: 'One cable to a clean recording, with monitoring you can trust.',
      description: 'Chorus USB converts at 24 bit inside the body and gives you a zero-latency headphone feed, so you hear yourself as the take happens rather than a beat later. The mute is a physical switch, not a software promise.',
      features: [
        '24 bit / 96 kHz onboard conversion',
        'Zero-latency headphone monitoring',
        'Physical mute switch with indicator',
        'Desk stand and boom thread included'
      ],
      specs: [
        { label: 'Capsule', value: '16 mm condenser' },
        { label: 'Pattern', value: 'Cardioid and omni' },
        { label: 'Conversion', value: '24 bit / 96 kHz' },
        { label: 'Connection', value: 'USB-C, class compliant' },
        { label: 'Monitoring', value: '3.5 mm zero latency' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 38,
      sku: 'NV-CHR-019',
      featured: false,
      isNew: false,
      releasedAt: '2025-01-15'
    },
    {
      id: 'nv-020',
      slug: 'ribbon-noir',
      name: 'Ribbon Noir',
      brand: 'NOVA',
      category: 'microphones',
      art: 'mic',
      hue: 280,
      price: 1490,
      oldPrice: null,
      rating: 4.8,
      reviewCount: 29,
      badge: null,
      colors: [
        { name: 'Noir', hex: '#0D0D10' },
        { name: 'Antique Brass', hex: '#8C6E3F' }
      ],
      blurb: 'Hand-built ribbon with the softness engineers keep asking us for.',
      description: 'Ribbon Noir uses a 1.8 micron corrugated ribbon tensioned by hand in our Lisbon workshop, then matched in pairs by measurement. On brass, guitar cabinets and strident voices it removes the edge without removing the detail underneath.',
      features: [
        '1.8 micron hand-tensioned ribbon',
        'Figure of eight pattern',
        'Matched pairs available on request',
        'Wooden case and suspension mount'
      ],
      specs: [
        { label: 'Capsule', value: '1.8 micron aluminium ribbon' },
        { label: 'Pattern', value: 'Figure of eight' },
        { label: 'Frequency response', value: '25 Hz - 18 kHz' },
        { label: 'Max SPL', value: '140 dB' },
        { label: 'Output', value: 'XLR balanced, 200 ohm' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 0,
      sku: 'NV-RBN-020',
      featured: false,
      isNew: false,
      releasedAt: '2025-11-19'
    },

    /* ---- Amplifiers ------------------------------------------------- */
    {
      id: 'nv-021',
      slug: 'forge-a80',
      name: 'Forge A80',
      brand: 'NOVA',
      category: 'amplifiers',
      art: 'amp',
      hue: 220,
      price: 1690,
      oldPrice: null,
      rating: 4.9,
      reviewCount: 74,
      badge: 'bestseller',
      colors: [
        { name: 'Gunmetal', hex: '#3B4048' },
        { name: 'Ivory', hex: '#EFEAE0' }
      ],
      blurb: 'Class A integrated that stays composed when the speakers get hard.',
      description: 'Forge A80 delivers 80 watts a side into 8 ohms and doubles into 4, which is the part of the spec sheet that decides whether difficult speakers behave. The chassis runs warm by design and the heatsinks are the case, so nothing needs a fan.',
      features: [
        '80 W per channel, doubling into 4 ohms',
        'Class A first 15 W',
        'Chassis-as-heatsink, fanless',
        'Home theatre bypass input'
      ],
      specs: [
        { label: 'Power', value: '80 W into 8 ohm per channel' },
        { label: 'Topology', value: 'Class A / AB integrated' },
        { label: 'Inputs', value: '4 RCA, 1 XLR, HT bypass' },
        { label: 'Distortion', value: '0.003 percent at 1 kHz' },
        { label: 'Weight', value: '16.4 kg' },
        { label: 'Warranty', value: '5 years' }
      ],
      stock: 5,
      sku: 'NV-FRG-021',
      featured: true,
      isNew: false,
      releasedAt: '2025-10-03'
    },
    {
      id: 'nv-022',
      slug: 'helix-tube',
      name: 'Helix Tube',
      brand: 'NOVA',
      category: 'amplifiers',
      art: 'amp',
      hue: 30,
      price: 2190,
      oldPrice: 2490,
      rating: 4.8,
      reviewCount: 36,
      badge: 'sale',
      colors: [
        { name: 'Copper', hex: '#9C6239' },
        { name: 'Black Chrome', hex: '#25272B' }
      ],
      blurb: 'Point-to-point valve amplifier with auto-biasing on all four tubes.',
      description: 'Helix Tube is wired point to point by two people who sign the underside of the chassis. Auto-biasing means you can roll tubes without a meter, and the output transformers are wound in-house to a spec we publish in full.',
      features: [
        'Point-to-point hand wiring',
        'Auto-bias across all four output tubes',
        'In-house wound output transformers',
        'Selectable 4, 8 and 16 ohm taps'
      ],
      specs: [
        { label: 'Power', value: '35 W per channel, ultralinear' },
        { label: 'Tubes', value: '4 x KT88, 2 x 12AU7' },
        { label: 'Taps', value: '4, 8 and 16 ohm' },
        { label: 'Inputs', value: '3 RCA, 1 XLR' },
        { label: 'Weight', value: '24.8 kg' },
        { label: 'Warranty', value: '5 years, 1 year on tubes' }
      ],
      stock: 3,
      sku: 'NV-HLX-022',
      featured: false,
      isNew: false,
      releasedAt: '2025-08-08'
    },
    {
      id: 'nv-023',
      slug: 'cadence-dac',
      name: 'Cadence DAC',
      brand: 'NOVA',
      category: 'amplifiers',
      art: 'amp',
      hue: 200,
      price: 549,
      oldPrice: null,
      rating: 4.6,
      reviewCount: 197,
      badge: null,
      colors: [
        { name: 'Slate', hex: '#3A3F46' },
        { name: 'Snow', hex: '#F2F1EE' }
      ],
      blurb: 'Desktop DAC and headphone amp with enough voltage for planars.',
      description: 'Cadence DAC swings 8 volts balanced, which is what hard-to-drive planar headphones actually need rather than what they nominally accept. Four digital inputs and a relay-switched volume control keep the desk tidy and the channel balance exact.',
      features: [
        '8 V balanced headphone output',
        'Relay-switched volume, no channel drift',
        'USB, optical, coaxial and Bluetooth in',
        'Fixed line out for a power amplifier'
      ],
      specs: [
        { label: 'Conversion', value: '32 bit / 768 kHz, DSD256' },
        { label: 'Output', value: '8 V balanced, 4 V single ended' },
        { label: 'Inputs', value: 'USB-C, optical, coaxial, Bluetooth' },
        { label: 'Outputs', value: '4.4 mm, 6.35 mm, fixed RCA' },
        { label: 'Weight', value: '1.9 kg' },
        { label: 'Warranty', value: '3 years' }
      ],
      stock: 20,
      sku: 'NV-CDN-023',
      featured: false,
      isNew: false,
      releasedAt: '2026-01-07'
    },
    {
      id: 'nv-024',
      slug: 'stride-portable',
      name: 'Stride Portable',
      brand: 'NOVA',
      category: 'amplifiers',
      art: 'amp',
      hue: 176,
      price: 319,
      oldPrice: null,
      rating: 4.4,
      reviewCount: 122,
      badge: 'new',
      colors: [
        { name: 'Aluminium', hex: '#C4C7C9' },
        { name: 'Deep Blue', hex: '#1F3350' },
        { name: 'Terracotta', hex: '#B15C3F' }
      ],
      blurb: 'Pocket amplifier and DAC that turns a phone into a real source.',
      description: 'Stride Portable takes the digital feed straight off a phone or laptop and hands your headphones 2 volts of clean, low-impedance drive. It charges through a separate port, so long listening sessions never drain the device feeding it.',
      features: [
        '2 V output from a 118 g body',
        'Separate charge and data ports',
        '14 h battery, USB-C both ends',
        'Analogue gain switch, no menus'
      ],
      specs: [
        { label: 'Conversion', value: '32 bit / 384 kHz' },
        { label: 'Output', value: '2 V into 32 ohm' },
        { label: 'Battery', value: '14 h continuous' },
        { label: 'Connection', value: 'USB-C data, USB-C charge' },
        { label: 'Weight', value: '118 g' },
        { label: 'Warranty', value: '2 years' }
      ],
      stock: 27,
      sku: 'NV-STR-024',
      featured: false,
      isNew: true,
      releasedAt: '2026-06-18'
    }
  ];

  /* ---------------------------------------------------------------------
   * Testimonials — 6
   * ------------------------------------------------------------------ */
  var testimonials = [
    {
      name: 'Ines Delacroix',
      role: 'Mastering engineer',
      city: 'Lyon',
      text: 'I bought Halo Studio expecting a decent second reference and ended up mixing three records on it. Nothing hides in the midrange, which is exactly the problem I pay for.',
      rating: 5,
      hue: 268
    },
    {
      name: 'Tomasz Wieczorek',
      role: 'Record shop owner',
      city: 'Krakow',
      text: 'Revolve MK II has been on the shop counter for eleven months and runs eight hours a day. It has needed one belt and no apologies.',
      rating: 5,
      hue: 14
    },
    {
      name: 'Amara Osei',
      role: 'Podcast producer',
      city: 'Accra',
      text: 'Field Dyn made my guest recordings usable in a room with a tin roof. That is not a sentence I expected to write about a microphone under 300 dollars.',
      rating: 5,
      hue: 120
    },
    {
      name: 'Rune Halvorsen',
      role: 'Architect',
      city: 'Bergen',
      text: 'Monolith 300 fills a double-height room without ever sounding like it is working. Delivery took a while and the crate was worth the wait.',
      rating: 5,
      hue: 300
    },
    {
      name: 'Priya Raghavan',
      role: 'Software engineer',
      city: 'Bengaluru',
      text: 'Nimbus ANC turned a four hour flight into something restful. The case charging wirelessly on my desk mat is a small thing I now cannot live without.',
      rating: 5,
      hue: 262
    },
    {
      name: 'Callum Byrne',
      role: 'Session guitarist',
      city: 'Dublin',
      text: 'Helix Tube took two weeks to settle and then opened up completely. The support team answered a tube question on a Sunday, which tells you most of what you need to know.',
      rating: 4,
      hue: 30
    }
  ];

  /* ---------------------------------------------------------------------
   * Reviews — two per product, 48 total. Every productId exists above.
   * ------------------------------------------------------------------ */
  var reviews = [
    { id: 'rv-01', productId: 'nv-001', author: 'Marta Feld', rating: 5, date: '2026-05-14', title: 'The pair I reach for daily', body: 'Six weeks in and the pads have moulded to my head. Open-back means my colleagues hear the chorus, but the trade is worth it for how far back the stage sits.', verified: true },
    { id: 'rv-02', productId: 'nv-001', author: 'Deniz Aktas', rating: 4, date: '2026-04-02', title: 'Great, needs a real amp', body: 'Straight from a laptop they sound thin. Through a decent headphone amplifier they come alive completely. Budget for both if you can.', verified: true },
    { id: 'rv-03', productId: 'nv-002', author: 'Ines Delacroix', rating: 5, date: '2026-06-21', title: 'Honest to a fault', body: 'It will not make a bad mix sound pleasant, which is the entire point. Isolation is good enough to track vocals in the same room.', verified: true },
    { id: 'rv-04', productId: 'nv-002', author: 'Greg Halloran', rating: 5, date: '2026-02-27', title: 'Replaced a pair twice the price', body: 'Bought these as a backup and the expensive set has not come out of the cupboard since. Pads are cheap to replace, which matters over years.', verified: true },
    { id: 'rv-05', productId: 'nv-003', author: 'Sofia Marchetti', rating: 5, date: '2026-05-30', title: 'Worth the saving', body: 'Took me a year to justify. The bass has texture rather than weight and I keep noticing new things in records I have owned for a decade.', verified: true },
    { id: 'rv-06', productId: 'nv-003', author: 'Adam Rezaei', rating: 4, date: '2026-03-18', title: 'Heavy but balanced', body: 'Almost 400 grams is real, though the arch spreads it well. Two hours is comfortable, four is a stretch. Sound is beyond reproach.', verified: true },
    { id: 'rv-07', productId: 'nv-004', author: 'Lena Brandt', rating: 4, date: '2026-06-29', title: 'Battery claim holds up', body: 'I charged them on arrival and again three weeks later. Noise cancelling is good on a train, merely fine on a plane.', verified: true },
    { id: 'rv-08', productId: 'nv-004', author: 'Owen Whitaker', rating: 4, date: '2026-07-11', title: 'Sensible commuter pair', body: 'Multipoint switching between phone and laptop is seamless. The folding hinge feels solid enough that I stopped using the case.', verified: false },
    { id: 'rv-09', productId: 'nv-005', author: 'Chiara Bonetti', rating: 5, date: '2026-05-05', title: 'Bigger than they look', body: 'The angled fit makes a real difference to the width. Case is metal and pleasant to fidget with, which was not on my list but should have been.', verified: true },
    { id: 'rv-10', productId: 'nv-005', author: 'Julien Marchand', rating: 4, date: '2026-03-27', title: 'Excellent, tips matter', body: 'The stock medium tips leaked bass badly for me. Swapping to the large size fixed it entirely, so try all four before judging.', verified: true },
    { id: 'rv-11', productId: 'nv-006', author: 'Hana Kobayashi', rating: 4, date: '2026-06-08', title: 'Perfect for quiet listening', body: 'I listen at low volume in a shared office and these keep the bass line present without me turning up. Exactly what was promised.', verified: true },
    { id: 'rv-12', productId: 'nv-006', author: 'Petra Novak', rating: 4, date: '2026-01-30', title: 'Tiny and comfortable', body: 'They disappear in the ear and I have worn them for a full workday. Call quality outdoors is average, everything else is strong.', verified: true },
    { id: 'rv-13', productId: 'nv-007', author: 'Diego Ferreira', rating: 4, date: '2026-07-02', title: 'They do not move', body: 'Twenty kilometres in heavy rain and neither bud shifted. Rinsed them under the tap after and they were fine.', verified: true },
    { id: 'rv-14', productId: 'nv-007', author: 'Rachel Okonjo', rating: 4, date: '2026-06-22', title: 'Hooks take a day to learn', body: 'Getting them seated felt awkward for the first run and became automatic by the third. Transparency mode is genuinely useful on roads.', verified: true },
    { id: 'rv-15', productId: 'nv-008', author: 'Priya Raghavan', rating: 5, date: '2026-04-19', title: 'The flight test', body: 'Cabin roar simply disappears. I could hear the seatbelt announcement clearly through transparency without taking them out.', verified: true },
    { id: 'rv-16', productId: 'nv-008', author: 'Stefan Lindqvist', rating: 5, date: '2026-02-14', title: 'Best cancelling I have used', body: 'Better than two considerably more famous pairs I owned before. The wind rejection while cycling is the surprise feature.', verified: true },
    { id: 'rv-17', productId: 'nv-009', author: 'Rune Halvorsen', rating: 5, date: '2026-05-22', title: 'Effortless in a big room', body: 'They are 40 kilograms each and you will want help. Once placed, they load an eight metre room without ever sounding strained.', verified: true },
    { id: 'rv-18', productId: 'nv-009', author: 'Miriam Vasquez', rating: 5, date: '2026-01-11', title: 'Forgiving about placement', body: 'I could not get them far from the rear wall and the downward port meant it barely mattered. The veneer is beautiful in person.', verified: true },
    { id: 'rv-19', productId: 'nv-010', author: 'Tom Ashby', rating: 4, date: '2026-06-15', title: 'Kitchen speaker, solved', body: 'For under a hundred dollars this is absurd. It lives on the windowsill and has survived rain twice.', verified: true },
    { id: 'rv-20', productId: 'nv-010', author: 'Nadia Ilyas', rating: 4, date: '2026-03-09', title: 'Stereo pairing is the trick', body: 'One is good, two paired is genuinely impressive for the size. Battery lasts a full weekend of camping.', verified: false },
    { id: 'rv-21', productId: 'nv-011', author: 'Bruno Sacchi', rating: 5, date: '2026-04-27', title: 'Vocals feel present', body: 'The midrange is the reason to buy these. Sealed cabinets mean they need a little power, so do not pair them with something weak.', verified: true },
    { id: 'rv-22', productId: 'nv-011', author: 'Elin Karlsson', rating: 4, date: '2026-02-03', title: 'Stands are not optional', body: 'On a shelf they sounded closed in. On proper stands at ear height they transformed. Factor that into the budget.', verified: true },
    { id: 'rv-23', productId: 'nv-012', author: 'Kwame Boateng', rating: 5, date: '2026-06-11', title: 'Fast rather than loud', body: 'It does not shake the house and I do not want it to. Kick drums stop when they should, which ported subs in this range rarely manage.', verified: true },
    { id: 'rv-24', productId: 'nv-012', author: 'Julia Sorensen', rating: 4, date: '2026-03-31', title: 'Room correction actually works', body: 'The sweep took two minutes and fixed a boom I had been fighting with furniture for a year. Presets are handy across two rooms.', verified: true },
    { id: 'rv-25', productId: 'nv-013', author: 'Tomasz Wieczorek', rating: 5, date: '2026-05-18', title: 'Runs all day in a shop', body: 'Eleven months of daily use, one belt change. Speed is rock steady even on records that have seen better decades.', verified: true },
    { id: 'rv-26', productId: 'nv-013', author: 'Marie Lefebvre', rating: 5, date: '2026-02-21', title: 'Set up in twenty minutes', body: 'Arrived pre-aligned and the instructions were honest about what to check. First record played the same evening.', verified: true },
    { id: 'rv-27', productId: 'nv-014', author: 'Sam Pritchard', rating: 5, date: '2026-06-02', title: 'The right first deck', body: 'Everything was balanced already. I have since swapped the cartridge and the tonearm handled the upgrade without any drama.', verified: true },
    { id: 'rv-28', productId: 'nv-014', author: 'Aiko Tanabe', rating: 4, date: '2026-04-09', title: 'Good value, plain phono stage', body: 'Deck itself is excellent for the money. The built-in phono stage is fine to start and worth bypassing later.', verified: true },
    { id: 'rv-29', productId: 'nv-015', author: 'Felix Adeyemi', rating: 4, date: '2026-05-27', title: 'Archived 200 records', body: 'The USB output does exactly what it claims at 24 bit. Auto-stop has saved my stylus more than once at the end of a side.', verified: true },
    { id: 'rv-30', productId: 'nv-015', author: 'Greta Molnar', rating: 4, date: '2026-01-24', title: 'Small footprint, solid build', body: 'It fits a shelf that nothing else would. The 78 speed was an unexpected bonus for the box of records my grandfather left.', verified: false },
    { id: 'rv-31', productId: 'nv-016', author: 'Anton Reiss', rating: 5, date: '2026-07-08', title: 'Footsteps no longer exist', body: 'I live above a tram line on a suspended floor. The magnetic sub-chassis solved a problem three previous decks could not.', verified: true },
    { id: 'rv-32', productId: 'nv-016', author: 'Camille Roux', rating: 5, date: '2026-06-26', title: 'Silent and precise', body: 'You cannot hear the speed correction working at all. The unipivot arm needs a careful hand and repays it immediately.', verified: true },
    { id: 'rv-33', productId: 'nv-017', author: 'Nora Bergstrom', rating: 5, date: '2026-05-09', title: 'Flatters without lying', body: 'The presence lift sits exactly where my voice needed help and never pushed into sibilance. Shockmount is properly made.', verified: true },
    { id: 'rv-34', productId: 'nv-017', author: 'Hugo Almeida', rating: 4, date: '2026-03-14', title: 'Excellent on acoustic guitar', body: 'Captures the body of the instrument without boom. Needs a treated room, as any large diaphragm condenser does.', verified: true },
    { id: 'rv-35', productId: 'nv-018', author: 'Amara Osei', rating: 5, date: '2026-06-18', title: 'Saved my untreated room', body: 'Off-axis rejection is remarkable. My guest recordings went from unusable to broadcast quality with no acoustic treatment at all.', verified: true },
    { id: 'rv-36', productId: 'nv-018', author: 'Liam Doherty', rating: 4, date: '2026-04-23', title: 'Bring gain', body: 'It is a quiet microphone and wants a clean preamp with headroom. Give it that and it is superb for the price.', verified: true },
    { id: 'rv-37', productId: 'nv-019', author: 'Zoe Fournier', rating: 4, date: '2026-07-04', title: 'One cable, done', body: 'Plugged in and recording within a minute on a laptop with no drivers. Zero-latency monitoring makes takes far easier.', verified: true },
    { id: 'rv-38', productId: 'nv-019', author: 'Ravi Menon', rating: 4, date: '2026-02-08', title: 'The physical mute is the feature', body: 'Every call, I use it. Sound is clearly better than the two USB microphones it replaced, though a dynamic still wins in a loud room.', verified: true },
    { id: 'rv-39', productId: 'nv-020', author: 'Beatrice Lang', rating: 5, date: '2026-06-05', title: 'On brass it is unmatched', body: 'Trumpet sessions that used to need heavy de-essing now need nothing. It is delicate, so treat the ribbon with respect.', verified: true },
    { id: 'rv-40', productId: 'nv-020', author: 'Peter Novotny', rating: 5, date: '2026-03-22', title: 'Tames a harsh cabinet', body: 'Put it in front of a bright guitar amplifier and the edge simply leaves while the detail stays. The matched pair is worth asking about.', verified: true },
    { id: 'rv-41', productId: 'nv-021', author: 'Isabel Moreno', rating: 5, date: '2026-05-25', title: 'Drives my difficult speakers', body: 'Doubling into 4 ohms is not marketing here. My previously unruly standmounts are finally under control at volume.', verified: true },
    { id: 'rv-42', productId: 'nv-021', author: 'Martin Kovacs', rating: 5, date: '2026-01-19', title: 'Runs warm, runs quiet', body: 'It gets hot as promised and makes no noise at all. The home theatre bypass meant one box instead of two in my rack.', verified: true },
    { id: 'rv-43', productId: 'nv-022', author: 'Callum Byrne', rating: 5, date: '2026-06-13', title: 'Opened up after two weeks', body: 'Out of the crate it was polite. After a fortnight it filled out completely. Auto-bias makes tube rolling genuinely painless.', verified: true },
    { id: 'rv-44', productId: 'nv-022', author: 'Sylvie Dumont', rating: 4, date: '2026-04-15', title: 'Beautiful, and heavy', body: 'Twenty-five kilograms of hand wiring, signed underneath. Only complaint is that the tubes deserve a cover in a house with cats.', verified: true },
    { id: 'rv-45', productId: 'nv-023', author: 'Jonas Ehrlich', rating: 5, date: '2026-05-02', title: 'Enough voltage for planars', body: 'Finally an affordable desktop unit that does not run out of steam on hungry headphones. The relay volume tracks perfectly at low level.', verified: true },
    { id: 'rv-46', productId: 'nv-023', author: 'Mei Chen', rating: 4, date: '2026-02-25', title: 'Four inputs, tidy desk', body: 'Console, laptop and turntable stage all connected at once. Bluetooth input is a convenience rather than a highlight.', verified: true },
    { id: 'rv-47', productId: 'nv-024', author: 'Andres Villalba', rating: 4, date: '2026-07-06', title: 'Turns a phone into a source', body: 'The separate charge port is the reason I bought it over three competitors. My phone battery no longer dies on long listens.', verified: true },
    { id: 'rv-48', productId: 'nv-024', author: 'Freya Nilsen', rating: 5, date: '2026-06-27', title: 'No menus, just a switch', body: 'Analogue gain switch on the side, nothing to configure. It has lived in my coat pocket for a month without a scratch.', verified: true }
  ];

  /* ---------------------------------------------------------------------
   * Commerce configuration
   * ------------------------------------------------------------------ */
  var promos = [
    { code: 'NOVA10', type: 'percent', value: 10, minSubtotal: 0, label: '10% off your order' },
    { code: 'SAVE50', type: 'fixed', value: 50, minSubtotal: 400, label: '$50 off orders over $400' },
    { code: 'FREESHIP', type: 'shipping', value: 0, minSubtotal: 0, label: 'Free shipping' }
  ];

  var shipping = {
    methods: [
      { id: 'standard', label: 'Standard', days: '4-6 business days', price: 12 },
      { id: 'express', label: 'Express', days: '1-2 business days', price: 29 }
    ],
    freeThreshold: 500
  };

  var taxRate = 0.08;

  /* ---------------------------------------------------------------------
   * Support copy
   * ------------------------------------------------------------------ */
  var faqs = [
    {
      q: 'How long does delivery take?',
      a: 'Standard delivery arrives in 4 to 6 business days and Express in 1 to 2. Orders over $500 ship free whichever speed you pick, and every parcel is tracked from the moment it leaves our workshop.'
    },
    {
      q: 'Can I return something I have listened to?',
      a: 'Yes. You have 30 days from delivery, and listening to the product does not void the return. We only ask that the packaging comes back with it so the next owner receives it properly protected.'
    },
    {
      q: 'What does the warranty cover?',
      a: 'Two to five years depending on the product, covering manufacturing and material faults. Tubes and consumable parts such as ear pads and styli carry a shorter term, listed on each product page.'
    },
    {
      q: 'Do you service products after the warranty ends?',
      a: 'We do, for as long as a product remains in our catalogue plus ten years. Parts are stocked in Lisbon and repairs are quoted before any work starts.'
    },
    {
      q: 'Which payment methods do you accept?',
      a: 'Card, PayPal and cash on delivery in supported regions. Card details are handled by our payment provider and never stored on our servers.'
    },
    {
      q: 'Can I hear something before I buy it?',
      a: 'Our listening rooms in Lisbon, Berlin and Toronto are open by appointment, and 40 partner dealers carry the range. Book a slot and we will have your shortlist warmed up and waiting.'
    }
  ];

  var journal = [
    {
      slug: 'why-we-still-voice-by-ear',
      title: 'Why we still voice every product by ear',
      excerpt: 'Measurements tell you what a driver did. They do not tell you whether anybody wanted it to. Here is how a NOVA product is signed off, and why the bench comes second.',
      date: '2026-06-02',
      readMins: 6,
      hue: 32,
      tag: 'Craft'
    },
    {
      slug: 'setting-up-a-turntable',
      title: 'Setting up a turntable without a protractor panic',
      excerpt: 'Tracking force, anti-skate and azimuth explained in plain language, with the three mistakes that account for most of the support calls we receive.',
      date: '2026-04-18',
      readMins: 8,
      hue: 14,
      tag: 'Guides'
    },
    {
      slug: 'the-room-is-the-speaker',
      title: 'The room is half of your speaker',
      excerpt: 'A rug, a bookshelf and thirty centimetres of distance will change your system more than most upgrades. What to move first, and what to ignore.',
      date: '2026-02-27',
      readMins: 5,
      hue: 268,
      tag: 'Listening'
    }
  ];

  /* ------------------------------------------------------------------ */
  window.NOVA.data = {
    brand: brand,
    categories: categories,
    products: products,
    testimonials: testimonials,
    reviews: reviews,
    promos: promos,
    shipping: shipping,
    taxRate: taxRate,
    faqs: faqs,
    journal: journal
  };
})();
