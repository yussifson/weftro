import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Generic black button classes replacing with indigo
  content = content.replace(/bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200/g, 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm');
  content = content.replace(/bg-slate-900 text-white hover:bg-slate-800/g, 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm');
  content = content.replace(/bg-slate-900 dark:bg-white text-white dark:text-slate-900/g, 'bg-indigo-600 text-white shadow-sm');
  
  // Canvas Whiteboard
  content = content.replace(/bg-slate-900 hover:bg-slate-800 text-white/g, 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm');
  
  // CommitmentTracker (this was dark mode bg-indigo-600, light mode bg-slate-900. I'll make it always indigo-600)
  content = content.replace(/bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white/g, 'bg-indigo-600 hover:bg-indigo-700 text-white');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated buttons in ${filePath}`);
  }
}

const walk = function(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
};

const allFiles = walk(path.join(process.cwd(), 'src'));
allFiles.forEach(replaceInFile);
console.log('Button colors updated!');
