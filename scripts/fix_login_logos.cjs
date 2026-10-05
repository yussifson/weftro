const fs = require('fs');

// Fix Login page remaining logo/color issues
let login = fs.readFileSync('src/pages/clipad/CliPadLogin.jsx', 'utf8');

// Fix right panel: old API `<CliPadLogo size={32} color="#ffffff" dotColor="#fad503" />`
// Replace the broken right-panel top branding div (it has a lone </div> close)
login = login.replace(
  `          {/* Top Branding & Headline */}
          <div className="relative z-10">
              <CliPadLogo size={32} color="#ffffff" dotColor="#fad503" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight max-w-md mt-2">`,
  `          {/* Top Branding & Headline */}
          <div className="relative z-10">
            <div className="mb-4">
              <CliPadLogo white height={36} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight max-w-md mt-2">`
);

// Fix small sidebar mockup logo
login = login.replace(
  `                      <CliPadLogo size={16} color="#00beac" dotColor="#fad503" />
                      <span className="font-bold tracking-tight text-xs text-white">KERINT V3</span>`,
  `                      <CliPadLogo white height={14} />`
);

// Fix the last #00beac status color in mockup footer
login = login.replace(
  `<span className="text-[#00beac] font-bold">`,
  `<span className="text-[#006065] font-bold">`
);

fs.writeFileSync('src/pages/clipad/CliPadLogin.jsx', login);
console.log('Login fixed');

// Fix SignUp page same pattern
let signup = fs.readFileSync('src/pages/clipad/CliPadSignUp.jsx', 'utf8');
signup = signup.replace(/CliPadLogo size={32} color="#00beac" dotColor="#fad503" \/>\s*\r?\n\s*<span[^>]*>KERINT<\/span>/g, 'CliPadLogo height={30} />');
signup = signup.replace(/CliPadLogo size={32} color="#ffffff" dotColor="#fad503" \/>/g, 'CliPadLogo white height={40} />');
signup = signup.replace(/CliPadLogo size={16} color="#00beac" dotColor="#fad503" \/>\s*\r?\n\s*<span[^>]*>KERINT V3<\/span>/g, 'CliPadLogo white height={14} />');
signup = signup.replace(/#00beac/gi, '#006065');
fs.writeFileSync('src/pages/clipad/CliPadSignUp.jsx', signup);
console.log('SignUp fixed');

console.log('Done!');
