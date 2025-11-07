# Git Commands for New GitHub Repository

## Step 1: Create New Repository on GitHub

1. Go to https://github.com/new
2. Create a new repository (e.g., `invoice-generator`)
3. **DO NOT** initialize with README, .gitignore, or license
4. Copy the repository URL (e.g., `https://github.com/yourusername/invoice-generator.git`)

## Step 2: Add All Files and Commit

```bash
# Add all files (including new ones)
git add .

# Commit all changes
git commit -m "Add password protection and deployment configuration"
```

## Step 3: Update Remote (if you want to change the existing remote)

```bash
# Remove existing remote (if needed)
git remote remove origin

# Add new remote
git remote add origin https://github.com/yourusername/invoice-generator.git
```

**OR** if you want to keep the old remote and add a new one:

```bash
# Add new remote with different name
git remote add new-origin https://github.com/yourusername/invoice-generator.git

# Push to new remote
git push -u new-origin main
```

## Step 4: Push to GitHub

```bash
# Push to main branch
git push -u origin main
```

## Alternative: If you want to start fresh

If you want to completely start fresh with a new repository:

```bash
# Remove existing git history (optional - only if you want fresh start)
rm -rf .git

# Initialize new git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Invoice generator with password protection"

# Add remote
git remote add origin https://github.com/yourusername/invoice-generator.git

# Push to GitHub
git push -u origin main
```

## Complete Command Sequence (Recommended)

```bash
# 1. Add all files
git add .

# 2. Commit changes
git commit -m "Add password protection, deployment configs, and security features"

# 3. Update remote URL (replace with your actual GitHub URL)
git remote set-url origin https://github.com/yourusername/invoice-generator.git

# 4. Push to GitHub
git push -u origin main
```

## If You Get Authentication Errors

If GitHub asks for authentication:

**Option 1: Use Personal Access Token**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` permissions
3. Use token as password when prompted

**Option 2: Use SSH (Recommended)**
```bash
# Change remote to SSH
git remote set-url origin git@github.com:yourusername/invoice-generator.git

# Push
git push -u origin main
```

## Verify Your Push

After pushing, check:
- All files are on GitHub
- `.gitignore` is working (sensitive files are NOT uploaded)
- No database files or secrets are committed

