#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const metaConfigPath = path.join(rootDir, 'packages/game-shared/src/config/meta-config.ts');
const changelogPath = path.join(rootDir, 'packages/website/app/routes/changelog.json');

// Get version type from command line argument
const versionType = process.argv[2]?.toLowerCase();

if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
  console.error('Usage: node scripts/release.js [major|minor|patch]');
  console.error('Example: node scripts/release.js minor');
  process.exit(1);
}

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse version (e.g., "0.8.3" -> [0, 8, 3])
const versionParts = currentVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Calculate new version based on type
let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

const newVersionTag = `v${newVersion}`;
const versionTypeLabel = versionType.charAt(0).toUpperCase() + versionType.slice(1);

console.log(`Updating version from ${currentVersion} to ${newVersion} (${versionTypeLabel} bump)...`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`✓ Updated package.json`);

// Update meta-config.ts
let metaConfigContent = fs.readFileSync(metaConfigPath, 'utf8');
metaConfigContent = metaConfigContent.replace(
  /VERSION: "v\d+\.\d+\.\d+"/,
  `VERSION: "${newVersionTag}"`
);
fs.writeFileSync(metaConfigPath, metaConfigContent);
console.log(`✓ Updated meta-config.ts`);

// Get git diff of current changes (before we make version updates)
console.log('\nGetting git diff of current changes...');
let diffOutput = '';
try {
  // Get staged changes
  const stagedDiff = execSync('git diff --staged', { encoding: 'utf8', cwd: rootDir });
  // Get unstaged changes
  const unstagedDiff = execSync('git diff', { encoding: 'utf8', cwd: rootDir });
  diffOutput = stagedDiff + unstagedDiff;
  
  if (!diffOutput.trim()) {
    console.warn('⚠ Warning: No changes detected in git diff. Proceeding with version bump only.');
  }
} catch (error) {
  // If git diff fails (e.g., no changes), continue anyway
  console.warn('⚠ Warning: Could not get git diff:', error.message);
  diffOutput = '';
}

// Parse diff to extract meaningful changes
const changes = [];
const diffLines = diffOutput.split('\n');

// Extract file changes and key modifications
const fileChanges = new Set();
const addedFiles = new Set();
const modifiedFiles = new Set();
let currentFile = '';
let inHunk = false;

for (let i = 0; i < diffLines.length; i++) {
  const line = diffLines[i];
  
  // Track which file is being changed
  if (line.startsWith('diff --git')) {
    const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
    if (match) {
      const oldFile = match[1];
      const newFile = match[2];
      currentFile = newFile;
      fileChanges.add(currentFile);
      
      // Check if it's a new file (oldFile will be /dev/null for new files)
      if (oldFile === '/dev/null' || oldFile.includes('/dev/null')) {
        addedFiles.add(currentFile);
      } else {
        modifiedFiles.add(currentFile);
      }
    }
  }
  
  // Also check for "new file" indicator
  if (line.startsWith('new file mode')) {
    if (currentFile) {
      addedFiles.add(currentFile);
    }
  }
  
  // Track hunks
  if (line.startsWith('@@')) {
    inHunk = true;
    continue;
  }
  
  if (line.startsWith('+++') || line.startsWith('---')) {
    continue;
  }
  
  // Extract meaningful additions (skip metadata, whitespace-only, etc.)
  if (inHunk && line.startsWith('+') && !line.startsWith('+++')) {
    const content = line.substring(1).trim();
    // Skip empty lines, comments-only, version numbers, and imports
    if (content && 
        !content.match(/^\s*$/) && 
        !content.match(/^\/\//) &&
        !content.match(/^\/\*/) &&
        !content.match(/^\*/) &&
        !content.match(/^version:/i) &&
        !content.match(/^VERSION:/) &&
        !content.match(/^import\s/) &&
        !content.match(/^export\s+.*from/) &&
        content.length > 10) {
      
      // Extract function/class names
      const funcMatch = content.match(/(?:function|const|export\s+(?:async\s+)?function|export\s+const)\s+(\w+)/);
      if (funcMatch) {
        changes.push(`Added ${funcMatch[1]} functionality`);
        continue;
      }
      
      const classMatch = content.match(/class\s+(\w+)/);
      if (classMatch) {
        changes.push(`Added ${classMatch[1]} class`);
        continue;
      }
      
      // Look for component/entity additions
      const componentMatch = content.match(/(\w+)(?:Component|Entity|Manager|Panel)/);
      if (componentMatch) {
        changes.push(`Added ${componentMatch[1]} component`);
        continue;
      }
    }
  }
  
  // Track deletions for "removed" or "fixed" items
  if (inHunk && line.startsWith('-') && !line.startsWith('---')) {
    const content = line.substring(1).trim();
    if (content && content.length > 10 && 
        !content.match(/^\/\//) &&
        !content.match(/^version:/i)) {
      // Could indicate a fix or removal
    }
  }
}

// If we couldn't extract specific changes, create generic ones based on files changed
if (changes.length === 0 && fileChanges.size > 0) {
  const changedFiles = Array.from(fileChanges);
  const importantFiles = changedFiles.filter(f => 
    !f.includes('node_modules') && 
    !f.includes('.git') &&
    !f.includes('package-lock.json') &&
    !f.includes('dist/') &&
    !f.includes('build/') &&
    !f.includes('package.json') &&
    !f.includes('meta-config.ts') &&
    !f.includes('changelog.json')
  );
  
  if (importantFiles.length > 0) {
    // Group by directory/type
    const byType = {};
    importantFiles.forEach(file => {
      const fileName = path.basename(file, path.extname(file));
      const dirParts = path.dirname(file).split(path.sep);
      const category = dirParts[dirParts.length - 1] || 'root';
      
      if (!byType[category]) {
        byType[category] = [];
      }
      byType[category].push(fileName);
    });
    
    Object.keys(byType).forEach(category => {
      const files = byType[category];
      if (files.length === 1) {
        changes.push(`Updated ${files[0]} in ${category}`);
      } else {
        changes.push(`Updated ${files.length} files in ${category}`);
      }
    });
  }
}

// Add info about new files
if (addedFiles.size > 0) {
  const newFiles = Array.from(addedFiles).filter(f => 
    !f.includes('node_modules') && 
    !f.includes('.git') &&
    !f.includes('dist/') &&
    !f.includes('build/')
  );
  if (newFiles.length > 0) {
    changes.push(`Added ${newFiles.length} new file${newFiles.length > 1 ? 's' : ''}`);
  }
}

// Remove duplicates
const uniqueChanges = [...new Set(changes)];

// If still no changes, add a default based on version type
if (uniqueChanges.length === 0) {
  const defaultMessages = {
    major: 'Major version update with significant changes',
    minor: 'Minor version update and improvements',
    patch: 'Patch version update with bug fixes and improvements'
  };
  uniqueChanges.push(defaultMessages[versionType]);
}

// Read changelog.json
const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));

// Get current date
const today = new Date().toISOString().split('T')[0];

// Add new changelog entry at the beginning
const newEntry = {
  version: newVersion,
  date: today,
  changes: uniqueChanges.slice(0, 10) // Limit to 10 changes
};

changelog.unshift(newEntry);
fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2) + '\n');
console.log(`✓ Updated changelog.json with ${uniqueChanges.length} changes`);

// Stage all changes (including version files and any existing staged/unstaged changes)
console.log('\nStaging all changes...');
// First, stage the version-related files
execSync('git add package.json packages/game-shared/src/config/meta-config.ts packages/website/app/routes/changelog.json', {
  cwd: rootDir,
  stdio: 'inherit'
});
// Then, stage any other changes that were already staged or unstaged
try {
  execSync('git add -A', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  // If git add fails, continue anyway
  console.warn('⚠ Warning: Could not stage all changes:', error.message);
}

// Commit
const commitMessage = `Version ${newVersion}: ${uniqueChanges[0] || `${versionTypeLabel} version update`}`;
console.log(`\nCommitting changes...`);
// Escape commit message for shell
const escapedMessage = commitMessage.replace(/"/g, '\\"');
execSync(`git commit -m "${escapedMessage}"`, {
  cwd: rootDir,
  stdio: 'inherit'
});

// Create tag
console.log(`\nCreating tag ${newVersionTag}...`);
execSync(`git tag -a ${newVersionTag} -m "Version ${newVersion}"`, {
  cwd: rootDir,
  stdio: 'inherit'
});

// Push commits and tags
console.log(`\nPushing to remote...`);
execSync('git push', {
  cwd: rootDir,
  stdio: 'inherit'
});
execSync(`git push origin ${newVersionTag}`, {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log(`\n✓ Successfully released version ${newVersion} (${versionTypeLabel})!`);
console.log(`  Tag: ${newVersionTag}`);
console.log(`  Changes: ${uniqueChanges.length} items added to changelog`);

