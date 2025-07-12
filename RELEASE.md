# 🚀 Automated Release Guide

This guide explains how to use the automated release system for Panggap.

## 📋 Overview

The release system uses **GitHub Actions** to automatically build your app for multiple platforms and create GitHub releases with downloadable installers.

### What happens automatically:
- ✅ **Multi-platform builds**: Windows, macOS
- ✅ **Automatic GitHub releases** with downloadable assets
- ✅ **Quality checks** via automated testing
- ✅ **Version management** with helper scripts

## 🎯 How to Create a Release

### Option 1: Using the Helper Script (Recommended)

```bash
# Patch release (1.0.0 → 1.0.1)
pnpm run release:patch

# Minor release (1.0.0 → 1.1.0)
pnpm run release:minor

# Major release (1.0.0 → 2.0.0)
pnpm run release:major
```

The script will:
1. ✅ Check that you're on the `main` branch
2. ✅ Ensure your working directory is clean
3. ✅ Update the version in `package.json`
4. ✅ Create a git commit and tag
5. ✅ Push changes to GitHub
6. ✅ Trigger the automated build

## 📦 What Gets Built

The GitHub Actions workflow builds:

### Windows
- `panggap-{version}-setup.exe` (NSIS installer)

### macOS
- `panggap-{version}-arm64.dmg` (Apple Silicon)
- `panggap-{version}-x64.dmg` (Intel)

## 🔍 Monitoring Releases

1. **Check GitHub Actions**: Go to the "Actions" tab in your repo
2. **Monitor builds**: Watch the "Release" workflow progress
3. **Download artifacts**: Once complete, assets appear in "Releases"

## 🛠️ GitHub Actions Details

### Workflows Created:

1. **`.github/workflows/release.yml`**
   - Triggers on version tags (`v*`)
   - Builds for all platforms
   - Creates GitHub releases

2. **`.github/workflows/test.yml`**
   - Runs on PRs and pushes to main
   - Ensures code quality before releases