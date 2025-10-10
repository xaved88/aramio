const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const shortHash = commitHash.substring(0, 6);
  const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
  
  // Truncate commit message to 100 characters and add [...] if needed
  let displayMessage = commitMessage;
  if (commitMessage.length > 100) {
    displayMessage = commitMessage.substring(0, 100) + '[...]';
  }
  
  const versionInfo = {
    commitHash: shortHash,
    commitMessage: displayMessage,
    buildTime: new Date().toISOString(),
  };
  
  const outputDir = path.join(__dirname, '..', 'src', 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'version.ts');
  const fileContent = `// Auto-generated file - do not edit manually
// Generated at build time from git commit hash

export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)} as const;
`;
  
  fs.writeFileSync(outputPath, fileContent);
  console.log(`✓ Version file generated: ${shortHash} - ${displayMessage}`);
} catch (error) {
  console.warn('Warning: Could not generate version from git:', error.message);
  const fallbackVersion = {
    commitHash: 'dev',
    commitMessage: 'Development version',
    buildTime: new Date().toISOString(),
  };
  
  const outputDir = path.join(__dirname, '..', 'src', 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'version.ts');
  const fileContent = `// Auto-generated file - do not edit manually
// Generated at build time from git commit hash

export const VERSION_INFO = ${JSON.stringify(fallbackVersion, null, 2)} as const;
`;
  
  fs.writeFileSync(outputPath, fileContent);
  console.log('✓ Version file generated with fallback');
}

