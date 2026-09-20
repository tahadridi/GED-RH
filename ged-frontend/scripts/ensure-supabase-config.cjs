const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'environments', 'supabase.config.ts');

if (!fs.existsSync(src)) {
  fs.copyFileSync(src + '.example', src);
  console.log('supabase.config.ts cree depuis le fichier exemple. Renseigne tes vraies cles Supabase.');
} else {
  console.log('supabase.config.ts deja present.');
}