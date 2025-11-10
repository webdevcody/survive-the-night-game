# Release Command

This command handles creating a new release by bumping the version number, analyzing git changes, updating the changelog, committing, and tagging.

## Usage

```
/release [major|minor|patch]
```

Examples:

- `/release minor` - Bump minor version (e.g., 0.8.3 → 0.9.0)
- `/release major` - Bump major version (e.g., 0.8.3 → 1.0.0)
- `/release patch` - Bump patch version (e.g., 0.8.3 → 0.8.4)

## Steps to Execute

### 1. Parse the Version Type Argument

- Extract the version type from the command: `major`, `minor`, or `patch`
- If no argument provided or invalid, show usage and exit
- Default to `minor` if user just says `/release` without specifying

### 2. Read Current Version

- Read `package.json` to get the current version (e.g., "0.8.3")
- Parse the version into major, minor, and patch components
- Calculate the new version based on the type:
  - **major**: `${major + 1}.0.0` (e.g., 0.8.3 → 1.0.0)
  - **minor**: `${major}.${minor + 1}.0` (e.g., 0.8.3 → 0.9.0)
  - **patch**: `${major}.${minor}.${patch + 1}` (e.g., 0.8.3 → 0.8.4)

### 3. Get Git Diff

- Run `git diff --staged` to get staged changes
- Run `git diff` to get unstaged changes
- Combine both diffs to get all current changes
- If no changes detected, warn but proceed with version bump

### 4. Analyze Changes and Update Changelog

- Read `packages/website/app/routes/changelog.json`
- Analyze the git diff to identify:

  - **New features**: New functions, classes, components, entities
  - **Bug fixes**: Removed code, error handling improvements, fixes
  - **Improvements**: Refactoring, performance optimizations, code quality
  - **Breaking changes**: API changes, removed features, major refactors
  - **UI/UX updates**: Component changes, styling updates, user-facing changes
  - **Configuration**: Config file changes, environment variable updates

- Create a new changelog entry with:

  ```json
  {
    "version": "0.9.0",
    "date": "2025-11-10",
    "changes": [
      "Added new feature X",
      "Fixed bug Y",
      "Improved performance of Z"
    ]
  }
  ```

- Add the entry at the **beginning** of the changelog array
- Be specific and descriptive - focus on what users/developers care about
- Limit to 10-15 most important changes
- Use present tense ("Added", "Fixed", "Improved") not past tense

### 5. Update Version Numbers

- Update `package.json`:

  - Set `version` field to the new version (e.g., "0.9.0")

- Update `packages/game-shared/src/config/meta-config.ts`:
  - Replace `VERSION: "v0.8.3"` with `VERSION: "v0.9.0"`
  - Use regex: `/VERSION: "v\d+\.\d+\.\d+"/`

### 6. Stage All Changes

- Stage version files: `package.json`, `meta-config.ts`, `changelog.json`
- Stage all other changes: `git add -A`
- This ensures everything is committed together

### 7. Commit with Descriptive Message

- Create commit message: `Version 0.9.0: [first changelog entry]`
- Example: `Version 0.9.0: Added new zombie type and improved weapon system`
- Use the first changelog entry as the commit message summary
- Escape quotes properly for shell execution

### 8. Create Git Tag

- Create annotated tag: `v0.9.0`
- Tag message: `Version 0.9.0`
- Use: `git tag -a v0.9.0 -m "Version 0.9.0"`

### 9. Push to Remote

- Push commits: `git push`
- Push tag: `git push origin v0.9.0`

## File Locations

- `package.json` - Root package.json with version
- `packages/game-shared/src/config/meta-config.ts` - Game version config
- `packages/website/app/routes/changelog.json` - Changelog entries

## Important Notes

- Always analyze the actual git diff to create accurate changelog entries
- Don't just list files changed - describe what actually changed and why it matters
- Group related changes together when possible
- If no meaningful changes detected, use a generic message based on version type:
  - Major: "Major version update with significant changes"
  - Minor: "Minor version update and improvements"
  - Patch: "Patch version update with bug fixes and improvements"
- Ensure all version numbers are consistent across files
- The changelog date should be today's date in YYYY-MM-DD format

## Example Execution Flow

1. User runs: `/release minor`
2. Claude reads current version: "0.8.3"
3. Claude calculates new version: "0.9.0"
4. Claude gets git diff of all changes
5. Claude analyzes diff and creates changelog entries:
   - "Added new FastZombie entity type"
   - "Improved weapon reload animation"
   - "Fixed collision detection bug in player movement"
6. Claude updates version in package.json and meta-config.ts
7. Claude adds new changelog entry at the beginning
8. Claude stages all files
9. Claude commits: "Version 0.9.0: Added new FastZombie entity type"
10. Claude creates tag: v0.9.0
11. Claude pushes commits and tag
