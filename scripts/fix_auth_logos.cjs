const fs = require('fs');

const fixAuthPage = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix form top logo (if it has gap-2.5 and span KERINT, replace it all)
  content = content.replace(
    /\{\/\* Top Logo \*\/\}\s*<div className="flex items-center gap-2\.5 mb-6 sm:mb-8">\s*<CliPadLogo[^>]*\/>\s*<span[^>]*>KERINT<\/span>\s*<\/div>/g,
    `{/* Top Logo */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <CliPadLogo height={48} iconOnly={true} />
            </div>`
  );

  // If it already has the wrong replacement (from a previous script that failed partly), fix it:
  content = content.replace(
    /\{\/\* Top Logo \*\/\}\s*<div className="flex items-center mb-6 sm:mb-8">\s*<CliPadLogo height=\{30\} \/>\s*<\/div>/g,
    `{/* Top Logo */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <CliPadLogo height={48} iconOnly={true} />
            </div>`
  );

  // Replace Optavel SSO logo with Optavel logo image (if not done)
  content = content.replace(
    /<Logo hideText=\{true\} className="w-4 h-4 text-\[#006065\]" \/>/g,
    `<img src="/optavel-favicon.svg" alt="Optavel" className="w-4 h-4" />`
  );

  // Fix right panel huge logo
  content = content.replace(
    /\{\/\* Top Branding & Headline \*\/\}\s*<div className="relative z-10">\s*<div className="flex items-center gap-2 mb-4">\s*<CliPadLogo[^>]*\/>\s*<\/div>/g,
    `{/* Top Branding & Headline */}
          <div className="relative z-10">
            <div className="mb-8">
              <CliPadLogo height={80} white={true} />
            </div>`
  );

  // Fix tiny mockup logo
  content = content.replace(
    /<CliPadLogo size=\{16\}[^>]*\/>/g,
    `<CliPadLogo height={16} white={true} iconOnly={true} />`
  );

  fs.writeFileSync(file, content);
};

fixAuthPage('src/pages/clipad/CliPadLogin.jsx');
fixAuthPage('src/pages/clipad/CliPadSignUp.jsx');
console.log('Fixed Auth Pages');
