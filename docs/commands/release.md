# Release Command

This command handles creating a new release by bumping the version number, analyzing git changes, updating the changelog, committing, and tagging.

## Usage

```
/release [major|minor|patch]
```

Examples:

- `/release minor` - Bump minor version (e.g., 0.19.0 → 0.20.0)
- `/release major` - Bump major version (e.g., 0.19.0 → 1.0.0)
- `/release patch` - Bump patch version (e.g., 0.19.0 → 0.19.1)

## Steps to Execute

### 1. Parse the Version Type Argument

- Extract the version type from the command: `major`, `minor`, or `patch`
- If no argument provided or invalid, show usage and exit
- Default to `minor` if user just says `/release` without specifying

### 2. Read Current Version

- Read `package.json` to get the current version (e.g., "0.19.0")
- Parse the version into major, minor, and patch components
- Calculate the new version based on the type:
  - **major**: `${major + 1}.0.0` (e.g., 0.19.0 → 1.0.0)
  - **minor**: `${major}.${minor + 1}.0` (e.g., 0.19.0 → 0.20.0)
  - **patch**: `${major}.${minor}.${patch + 1}` (e.g., 0.19.0 → 0.19.1)

### 3. Get Git Changes Since Last Release

- Find the last release tag: `git describe --tags --abbrev=0` or check the latest version in changelog.json
- Get commits since last release: `git log <last-tag>..HEAD --oneline`
- Get detailed diff: `git diff <last-tag>..HEAD` or `git diff HEAD~N..HEAD` (where N is number of commits)
- For patch releases, focus on commits since the last version tag
- Review commit messages and `git show <commit>` to understand changes
- If no changes detected, warn but proceed with version bump

### 4. Analyze Changes and Update Changelog

- Read `packages/website/app/routes/changelog.json`
- Analyze the git commits and diff to identify:

  - **New features** (✨): New functions, classes, components, entities, user-facing additions
  - **Bug fixes** (🐛): Removed code, error handling improvements, fixes
  - **Improvements** (🔧): Refactoring, performance optimizations, code quality, architecture changes
  - **Performance** (⚡): Performance optimizations, caching, efficiency improvements
  - **Breaking changes** (💥): API changes, removed features, major refactors
  - **UI/UX updates** (🎨): Component changes, styling updates, user-facing visual changes
  - **Configuration** (⚙️): Config file changes, environment variable updates
  - **Documentation** (📝): Documentation additions and updates
  - **Infrastructure** (🏗️): Build system, deployment, infrastructure changes
  - **Audio** (🎵): Sound effects, music, audio system changes

- Create a new changelog entry with:

  ```json
  {
    "version": "0.19.1",
    "date": "2025-11-19",
    "changes": [
      "✨ Added inventory drag and drop functionality - players can now drag items from inventory slots to drop them",
      "🔧 Refactored inventory management - introduced selected inventory slot system for improved item selection",
      "🐛 Fixed bug description here"
    ]
  }
  ```

- Add the entry at the **beginning** of the changelog array
- Be specific and descriptive - focus on what users/developers care about
- Use emoji prefixes (✨, 🐛, 🔧, ⚡, 🎨, etc.) to categorize changes
- Limit to 10-15 most important changes
- Use present tense ("Added", "Fixed", "Improved") not past tense
- Get current date: `date +%Y-%m-%d` (format: YYYY-MM-DD)

### 5. Update Version Numbers

- Update `package.json`:

  - Set `version` field to the new version (e.g., "0.19.1")

- Update `packages/game-shared/src/config/meta-config.ts`:
  - Replace `VERSION: "v0.19.0"` with `VERSION: "v0.19.1"`
  - Use exact string match: `VERSION: "v0.19.0"` → `VERSION: "v0.19.1"`

### 6. Stage All Changes

- Stage version files: `package.json`, `meta-config.ts`, `changelog.json`
- Stage all other changes: `git add -A`
- This ensures everything is committed together

### 7. Commit with Descriptive Message

- Create commit message: `Version 0.19.1: [first changelog entry without emoji]`
- Example: `Version 0.19.1: Added inventory drag and drop functionality`
- Use the first changelog entry (without emoji) as the commit message summary
- Escape quotes properly for shell execution

### 8. Create Git Tag

- Create annotated tag: `v0.19.1`
- Tag message: `Version 0.19.1`
- Use: `git tag -a v0.19.1 -m "Version 0.19.1"`

### 9. Push to Remote

- Push commits: `git push`
- Push tag: `git push origin v0.19.1`
- Or combine: `git push && git push origin v0.19.1`

## File Locations

- `package.json` - Root package.json with version
- `packages/game-shared/src/config/meta-config.ts` - Game version config
- `packages/website/app/routes/changelog.json` - Changelog entries

## Important Notes

- Always analyze the actual git commits and diff to create accurate changelog entries
- Don't just list files changed - describe what actually changed and why it matters
- Group related changes together when possible
- Use emoji prefixes consistently based on change type (✨, 🐛, 🔧, ⚡, 🎨, etc.)
- For patch releases, focus on commits since the last version tag
- If no meaningful changes detected, use a generic message based on version type:
  - Major: "Major version update with significant changes"
  - Minor: "Minor version update and improvements"
  - Patch: "Patch version update with bug fixes and improvements"
- Ensure all version numbers are consistent across files
- The changelog date should be today's date in YYYY-MM-DD format (use `date +%Y-%m-%d`)

## Example Execution Flow

1. User runs: `/release patch`
2. Read current version: "0.19.0"
3. Calculate new version: "0.19.1"
4. Get commits since last release: `git log v0.19.0..HEAD --oneline`
5. Analyze commits and diff to understand changes
6. Create changelog entries:
   - "✨ Added inventory drag and drop functionality - players can now drag items from inventory slots to drop them"
   - "🔧 Refactored inventory management - introduced selected inventory slot system"
   - "✨ Added drop item event handler - new server-side handler for dropping items"
7. Get current date: `date +%Y-%m-%d` → "2025-11-19"
8. Update version in package.json and meta-config.ts
9. Add new changelog entry at the beginning
10. Stage all files: `git add -A`
11. Commit: `git commit -m "Version 0.19.1: Added inventory drag and drop functionality"`
12. Create tag: `git tag -a v0.19.1 -m "Version 0.19.1"`
13. Push commits and tag: `git push && git push origin v0.19.1`

## Changes Made During 0.19.1 Release

The following improvements were made to the release process:

1. **Better change detection**: Instead of just using `git diff`, now analyze commits since the last release tag using `git log <last-tag>..HEAD`
2. **Commit analysis**: Review commit messages and use `git show <commit>` to understand detailed changes
3. **Date handling**: Use `date +%Y-%m-%d` command to get current date in correct format
4. **Emoji prefixes**: Added emoji categorization system (✨, 🐛, 🔧, ⚡, 🎨, etc.) for better changelog readability
5. **Patch release focus**: For patch releases, focus specifically on commits since the last version tag
6. **Changelog format**: Ensure changelog entries are descriptive and explain the impact, not just what files changed
