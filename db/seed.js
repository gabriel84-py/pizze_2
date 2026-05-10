require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcrypt');

console.log('🌱 Seeding database Parigina...');

// ── Settings ──────────────────────────────────────────────────────────────────
const settings = {
  site_name:        'Parigina',
  site_domain:      'parigina.fr',
  phone:            '+33768280628',
  phone_display:    '07 68 28 06 28',
  email:            '',
  address_street:   '628 Avenue de Rheinbach',
  address_city:     'Villeneuve-lès-Avignon',
  address_zip:      '30400',
  address_country:  'France',
  google_maps_url:  'https://maps.google.com/?q=Parigina,628+Avenue+de+Rheinbach,30400+Villeneuve-les-Avignon',
  facebook_url:     'https://www.facebook.com/parigina84/',
  instagram_url:    '',
  uber_eats_url:    '',
  uber_eats_active: '0',
  hero_title:       'Pizza napolitaine\nau feu de bois',
  hero_tagline:     'Recettes traditionnelles de Naples, à Villeneuve-lès-Avignon',
  hero_photo:       'devanture-nuit.jpg',
  about_title:      'Notre histoire',
  about_text:       "Parigina, c'est d'abord un food truck qui a sillonné la région avant de poser ses roues à Villeneuve-lès-Avignon en 2024 pour ouvrir sa première pizzeria fixe.\n\nLe concept revendique des pizzas traditionnelles napolitaines au feu de bois, avec des recettes directement inspirées de Naples. Chaque pizza est façonnée à la main, cuite dans notre four à bois, avec des ingrédients soigneusement sélectionnés pour leur authenticité.\n\nLa Parigina — spécialité napolitaine emblématique — a donné son nom à notre adresse : une invitation à découvrir la vraie pizza italienne, loin des clichés.",
  about_photo_1:    '',
  about_photo_2:    '',
  meta_description: 'Pizzeria napolitaine traditionnelle au feu de bois à Villeneuve-lès-Avignon. Recettes directement inspirées de Naples, pâte fraîche du jour, ingrédients sélectionnés. Note Google 4.9/5.',
  meta_keywords:    'pizzeria, napolitaine, feu de bois, villeneuve les avignon, pizza italienne, parigina',
  google_rating:    '4.9',
  google_count:     '43',
  announcement:     '',
  announcement_active: '0',
  siret:            '903 838 837 00032',
  siren:            '903 838 837',
  rcs:              'Nîmes',
  capital:          '1 000,00 €',
  legal_form:       'SARL unipersonnelle',
  dirigeant:        'Franck GUERARD',
  hebergeur:        '',
};

const upsert = db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
const upsertMany = db.transaction(() => {
  for (const [k, v] of Object.entries(settings)) upsert.run(k, v);
});
upsertMany();
console.log('✅ Settings insérés');

// ── Horaires ──────────────────────────────────────────────────────────────────
db.prepare(`DELETE FROM horaires`).run();
const days = [
  { dow: 1, fr: 'Lundi',     en: 'Monday',    it: 'Lunedì',    opens: null,    closes: null,    closed: 1 },
  { dow: 2, fr: 'Mardi',     en: 'Tuesday',   it: 'Martedì',   opens: '18:00', closes: '21:00', closed: 0 },
  { dow: 3, fr: 'Mercredi',  en: 'Wednesday', it: 'Mercoledì', opens: '18:00', closes: '21:00', closed: 0 },
  { dow: 4, fr: 'Jeudi',     en: 'Thursday',  it: 'Giovedì',   opens: '18:00', closes: '21:00', closed: 0 },
  { dow: 5, fr: 'Vendredi',  en: 'Friday',    it: 'Venerdì',   opens: '18:00', closes: '21:30', closed: 0 },
  { dow: 6, fr: 'Samedi',    en: 'Saturday',  it: 'Sabato',    opens: '18:00', closes: '21:30', closed: 0 },
  { dow: 0, fr: 'Dimanche',  en: 'Sunday',    it: 'Domenica',  opens: null,    closes: null,    closed: 1 },
];
const insHoraire = db.prepare(`INSERT INTO horaires(day_of_week,day_name_fr,day_name_en,day_name_it,opens,closes,is_closed) VALUES(?,?,?,?,?,?,?)`);
days.forEach(d => insHoraire.run(d.dow, d.fr, d.en, d.it, d.opens, d.closes, d.closed));
console.log('✅ Horaires insérés');

// ── Catégories menu ───────────────────────────────────────────────────────────
db.prepare(`DELETE FROM menu_items`).run();
db.prepare(`DELETE FROM menu_categories`).run();

const cats = [
  { name: 'Pizzas classiques',  slug: 'classiques', order: 1 },
  { name: 'Pizzas blanches',    slug: 'blanches',   order: 2 },
  { name: 'Boissons',           slug: 'boissons',   order: 3 },
  { name: 'Suppléments',        slug: 'supplements', order: 4 },
];
const insCat = db.prepare(`INSERT INTO menu_categories(name,slug,sort_order) VALUES(?,?,?)`);
cats.forEach(c => insCat.run(c.name, c.slug, c.order));

const catIds = {};
db.prepare(`SELECT id, slug FROM menu_categories`).all().forEach(r => { catIds[r.slug] = r.id; });
console.log('✅ Catégories insérées');

// ── Pizzas classiques ─────────────────────────────────────────────────────────
const insItem = db.prepare(`
  INSERT INTO menu_items(category_id,name,price,description,badge_veggie,badge_piquant,badge_truffe,is_featured,sort_order)
  VALUES(?,?,?,?,?,?,?,?,?)
`);

const classiques = [
  { name: 'Margherita',    price: 11, desc: 'Tomate, mozzarella, parmigiano, basilic, huile d\'olive',                                                                                         veggie: 1, piquant: 0, truffe: 0, featured: 0, order: 1 },
  { name: 'Forestière',    price: 13, desc: 'Tomate, mozzarella, champignons frais',                                                                                                            veggie: 1, piquant: 0, truffe: 0, featured: 0, order: 2 },
  { name: 'Roma',          price: 13, desc: 'Tomate, mozzarella, jambon cuit italien, olives',                                                                                                  veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 3 },
  { name: 'Regina',        price: 14, desc: 'Tomate, mozzarella, champignons frais, jambon cuit italien, olives',                                                                               veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 4 },
  { name: '4 Stagioni',    price: 16, desc: 'Tomate, mozzarella, champignons frais, artichauts à la romaine, jambon cuit italien, olives',                                                      veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 5 },
  { name: 'Napoli',        price: 14, desc: 'Tomate, mozzarella, anchois, fleurs de câpres, olives',                                                                                           veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 6 },
  { name: 'Capri',         price: 16, desc: 'Tomate, mozzarella, thon italien, fleurs de câpres, oignons rouges, olives',                                                                      veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 7 },
  { name: 'Parmigiana',    price: 14, desc: 'Tomate, mozzarella, aubergines frites, tomates cerises, parmigiano reggiano 24 mois',                                                              veggie: 1, piquant: 0, truffe: 0, featured: 0, order: 8 },
  { name: 'Végétarienne',  price: 15, desc: 'Tomate, mozzarella, champignons frais, aubergines et courgettes frites, artichauts à la romaine, tomates cerises',                                 veggie: 1, piquant: 0, truffe: 0, featured: 0, order: 9 },
  { name: 'Piccanta',      price: 14, desc: 'Tomate, mozzarella, spianata, olives',                                                                                                             veggie: 0, piquant: 1, truffe: 0, featured: 0, order: 10 },
  { name: 'Sicilienne',    price: 16, desc: 'Tomate, mozzarella, champignons frais, spianata, jambon cuit italien, olives',                                                                     veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 11 },
  { name: 'Corsica',       price: 17, desc: 'Tomate, mozzarella, figatelli, brossiu ou brousse corse, tomate confite',                                                                          veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 12 },
  { name: 'Bufala',        price: 15, desc: 'Tomate, mozzarella, tomates cerises, basilic — Après cuisson : Mozzarella di Bufala, Parmigiano Reggiano 24 mois, huile d\'olive, crème balsamique', veggie: 1, piquant: 0, truffe: 0, featured: 0, order: 13 },
  { name: 'Roquette',      price: 17, desc: 'Tomate, mozzarella, tomates cerises — Après cuisson : jambon de Parme 24 mois, Parmigiano Reggiano 24 mois, tomates confites, huile d\'olive, crème balsamique', veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 14 },
  { name: 'Parma',         price: 18, desc: 'Tomate, mozzarella, tomates cerises — Après cuisson : jambon de Parme 24 mois, Mozzarella di Bufala, tomates confites, Parmigiano Reggiano 24 mois, huile d\'olive, crème balsamique', veggie: 0, piquant: 0, truffe: 0, featured: 1, order: 15 },
];
classiques.forEach(p => insItem.run(catIds['classiques'], p.name, p.price, p.desc, p.veggie, p.piquant, p.truffe, p.featured, p.order));

// ── Pizzas blanches ───────────────────────────────────────────────────────────
const blanches = [
  { name: 'Tartufo',       price: 15, desc: 'Crème de truffe, mozzarella, jambon cuit italien, huile d\'olive à la truffe noire',                                                               veggie: 0, piquant: 0, truffe: 1, featured: 1, order: 1 },
  { name: 'Miel di Capra', price: 14, desc: 'Crème, mozzarella, chèvre, miel, amandes effilées',                                                                                               veggie: 1, piquant: 0, truffe: 0, featured: 1, order: 2 },
  { name: 'Carbonara',     price: 17, desc: 'Crème, mozzarella, guanciale, coppa, pecorino poivré',                                                                                            veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 3 },
  { name: 'Montagna',      price: 18, desc: 'Crème, mozzarella, guanciale, fontina — Après cuisson : jambon de Parme 24 mois',                                                                  veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 4 },
  { name: 'Toscane',       price: 17, desc: 'Crème, mozzarella, gorgonzola — Après cuisson : jambon de Parme 24 mois, Parmigiano Reggiano 24 mois',                                            veggie: 0, piquant: 0, truffe: 0, featured: 0, order: 5 },
  { name: 'Landaise',      price: 18, desc: 'Crème de cèpes, mozzarella — Après cuisson : magret de canard fumé du Sud-Ouest, confit de figues',                                               veggie: 0, piquant: 0, truffe: 0, featured: 1, order: 6 },
];
blanches.forEach(p => insItem.run(catIds['blanches'], p.name, p.price, p.desc, p.veggie, p.piquant, p.truffe, p.featured, p.order));

// ── Boissons ──────────────────────────────────────────────────────────────────
const boissons = [
  { name: 'Softs',                price: 2.50, desc: 'Eau, Coca-Cola, Sprite, Orangina…',        order: 1 },
  { name: 'Limonades italiennes', price: 3.50, desc: 'Limonades artisanales importées d\'Italie', order: 2 },
  { name: 'Bières italiennes',    price: 4.50, desc: 'Bières italiennes en bouteille',            order: 3 },
  { name: 'Vins italiens',        price: 14,   desc: 'À partir de 14 € — carte disponible sur place', order: 4 },
];
boissons.forEach(b => insItem.run(catIds['boissons'], b.name, b.price, b.desc, 0, 0, 0, 0, b.order));

// ── Suppléments ───────────────────────────────────────────────────────────────
const supplements = [
  { name: 'Légumes',                  price: 1.50, order: 1 },
  { name: 'Fromages',                 price: 2.00, order: 2 },
  { name: 'Charcuteries',             price: 2.50, order: 3 },
  { name: 'Légumes confits',          price: 2.50, order: 4 },
  { name: 'Anchois',                  price: 2.50, order: 5 },
  { name: 'Jambon de Parme / Magret', price: 3.50, order: 6 },
  { name: 'Mozzarella di Bufala',     price: 3.50, order: 7 },
];
supplements.forEach(s => insItem.run(catIds['supplements'], s.name, s.price, s.desc || '', 0, 0, 0, 0, s.order));
console.log('✅ Menu inséré');

// ── Témoignages ───────────────────────────────────────────────────────────────
db.prepare(`DELETE FROM testimonials`).run();
const insTesti = db.prepare(`INSERT INTO testimonials(author,rating,content,date_str,source,is_visible,sort_order) VALUES(?,?,?,?,?,?,?)`);
const testimonials = [
  { author: 'Marie L.',     rating: 5, content: 'Pizzas excellentes avec une pâte fine et ingrédients de qualité. Trop contente d\'avoir trouvé cette adresse, car j\'en ai pas trouvé de bonnes pizzas depuis que j\'habite dans la région du grand Avignon.', date: '', order: 1 },
  { author: 'Thomas R.',    rating: 5, content: 'Je n\'avais pas mangé une aussi bonne pizza (la Landaise) depuis des années. La pâte était parfaite et le goût des cèpes à tomber par terre.', date: 'Février 2025', order: 2 },
  { author: 'Sophie M.',    rating: 5, content: 'De loin les meilleures pizzas à emporter testées sur Villeneuve / Les Angles. Pâte de qualité, garniture fraîche et goûteuse.', date: '', order: 3 },
  { author: 'James H.',     rating: 5, content: 'The pizza maker is extremely friendly. What more could you want?', date: '', order: 4 },
  { author: 'Famille B.',   rating: 5, content: 'Très bonnes pizzas, nous avons tous apprécié ! Accueil très sympathique. Pizzeria très bien située et pratique pour se garer. Prix tout à fait raisonnables.', date: 'Novembre 2024', order: 5 },
  { author: 'Camille P.',   rating: 5, content: 'Découverte sympathique ! Les pizzas sont bonnes, le pizzaiolo accueillant, le lieu top. À tester absolument dans le coin !', date: '', order: 6 },
];
testimonials.forEach(t => insTesti.run(t.author, t.rating, t.content, t.date, 'Google', 1, t.order));
console.log('✅ Témoignages insérés');

// ── Admin user ────────────────────────────────────────────────────────────────
const existingAdmin = db.prepare(`SELECT id FROM admin_users WHERE username = ?`).get('admin');
if (!existingAdmin) {
  const hash = bcrypt.hashSync('parigina2024!', 12);
  db.prepare(`INSERT INTO admin_users(username,password_hash,email) VALUES(?,?,?)`).run('admin', hash, '');
  console.log('✅ Admin créé — login: admin / mdp: parigina2024!');
  console.log('⚠️  CHANGEZ LE MOT DE PASSE depuis l\'interface admin immédiatement !');
} else {
  console.log('ℹ️  Admin existant, skip.');
}

console.log('\n🎉 Seed terminé avec succès !');
process.exit(0);
