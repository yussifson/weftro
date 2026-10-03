const fs = require('fs');
let b = fs.readFileSync('src/pages/clipad/CliPadBilling.jsx', 'utf8');

// Change grid back to a standard max-width so it's not super wide
b = b.replace(/className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 w-full items-stretch"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full items-stretch max-w-7xl mx-auto"');
b = b.replace(/className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full items-stretch max-w-7xl mx-auto"');

// Reduce card padding and fix layout
b = b.replace(/p-8 flex flex-col/g, 'p-6 flex flex-col');
b = b.replace(/mt-auto py-3\.5 rounded-xl font-bold/g, 'mt-auto py-2.5 rounded-lg text-sm font-semibold');

// Clean up text spacing
b = b.replace(/<p className="text-3xl font-bold mt-4">/g, '<p className="text-2xl font-bold mt-2">');
b = b.replace(/<ul className="mt-6 space-y-3">/g, '<ul className="mt-4 mb-6 space-y-2.5">');

fs.writeFileSync('src/pages/clipad/CliPadBilling.jsx', b);
