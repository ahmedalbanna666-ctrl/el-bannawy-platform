#!/bin/bash
set -euo pipefail

echo "========================================"
echo "  El-bannawy Platform - Setup Script"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed."
  exit 1
fi
echo "✓ Node.js $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "ERROR: pnpm is not installed. Run: npm install -g pnpm"
  exit 1
fi
echo "✓ pnpm $(pnpm --version)"

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install
echo "✓ Dependencies installed"

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
pnpm --filter @el-bannawy/database generate 2>/dev/null || echo "WARNING: Prisma generation skipped"

# Copy environment file
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "✓ .env created from .env.example"
fi

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
