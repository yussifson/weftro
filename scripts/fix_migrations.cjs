const fs = require('fs');

const file6 = 'supabase/migrations/20261007220000_clipad_v3_phase6_browser_capture.sql';
let c6 = fs.readFileSync(file6, 'utf8');
c6 = c6.replace('company_id text NOT NULL', 'company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE');
fs.writeFileSync(file6, c6, 'utf8');

const file7 = 'supabase/migrations/20261007230000_clipad_v3_phase7_connect.sql';
let c7 = fs.readFileSync(file7, 'utf8');
c7 = c7.replace(/company_id text NOT NULL/g, 'company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE');
fs.writeFileSync(file7, c7, 'utf8');

console.log('Fixed migrations!');
