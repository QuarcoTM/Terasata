/**
 * Content-only configuration for the initial frontend build.
 * This is deliberately NOT an administration panel or a database.
 * A secure server-side administration module will replace this file later.
 * No example dishes, invented prices, or unapproved news are published.
 */
window.TERASATA_CONTENT = {
  restaurantName: 'Терасата',
  phoneDisplay: '089 295 9030',
  phoneHref: 'tel:+359892959030',
  addressDisplay: 'гр. Кюстендил, ул. „Шейново“ №10',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%D1%83%D0%BB.%20%D0%A8%D0%B5%D0%B9%D0%BD%D0%BE%D0%B2%D0%BE%2010%2C%20%D0%9A%D1%8E%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B8%D0%BB',
  facebookUrl: 'https://www.facebook.com/share/1Ew96Ns9bp/',
  instagramUrl: 'https://www.instagram.com/terasatakyustendil/',
  categories: [
    { id: 'salati', name: 'Салати' },
    { id: 'predyastiya', name: 'Предястия' },
    { id: 'kartofi', name: 'Картофи' },
    { id: 'pasta-i-oriz', name: 'Паста и ориз' },
    { id: 'osnovni-yastiya', name: 'Основни ястия' },
    { id: 'skara', name: 'Скара' },
    { id: 'riba-i-morski-darove', name: 'Риба и морски дарове' }
  ],
  // These are intentionally empty until food items / prices are checked and approved.
  regularMenu: {},
  // Each date must be YYYY-MM-DD in Europe/Sofia local time.
  // Menus are visible ONLY Monday-Friday and ONLY when published=true.
  // Example shape: { '2026-11-02': { published:true, groups:[{title:'Салати',items:[{name:'...',weight:'250 г',price:'3,20 €'}]}] } }
  lunchByDate: {},
  // Only actual approved news will appear on the homepage.
  news: [],
  gallery: [
    { src: 'terrace.webp', alt: 'Покритата тераса на ресторант „Терасата“', category: 'Тераси', title: 'Тераса' },
    { src: 'main-hall.webp', alt: 'Основната вътрешна зала с подредени маси', category: 'Вътрешни зали', title: 'Основна зала' },
    { src: 'celebration-table.webp', alt: 'Подредена маса за празненство във вътрешната зала', category: 'Празненства', title: 'Подготовка за празненство' },
    { src: 'second-floor.webp', alt: 'Вътрешната зала на втория етаж с празнична украса', category: 'Вътрешни зали', title: 'Втори етаж' },
    { src: 'bar.webp', alt: 'Барът с надпис „ТЕРАСАТА“', category: 'Вътрешни зали', title: 'Бар' }
  ]
};
