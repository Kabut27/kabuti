#!/usr/bin/env bash
# ─────────────────────────────────────────────
#  Kabuti Bando – 3x-ui Subscription Template
#  Installer Script
#  Usage: bash <(curl -fsSL https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/install.sh)
# ─────────────────────────────────────────────

set -e

# ── Config ──────────────────────────────────
REPO_USER="Kabut27"
REPO_NAME="kabuti"
BRANCH="main"
TEMPLATE_FILE="sub.html"
SOURCE_URL="https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/${BRANCH}/${TEMPLATE_FILE}"
INSTALL_DIR="/etc/x-ui/sub"
INSTALL_FILE="${INSTALL_DIR}/${TEMPLATE_FILE}"

# ── Colors ──────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Banner ──────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║       Kabuti Bando – Sub Template        ║${NC}"
echo -e "${CYAN}${BOLD}║         3x-ui Custom Installer           ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Root check ──────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[✗] Please run as root: sudo bash <(...)${NC}"
  exit 1
fi

# ── Detect downloader ───────────────────────
if command -v curl &>/dev/null; then
  DOWNLOAD="curl -fsSL"
elif command -v wget &>/dev/null; then
  DOWNLOAD="wget -qO-"
else
  echo -e "${RED}[✗] Neither curl nor wget found. Install one and retry.${NC}"
  exit 1
fi

# ── Create install directory ────────────────
echo -e "${YELLOW}[→] Creating install directory: ${INSTALL_DIR}${NC}"
mkdir -p "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR"

# ── Backup existing file ─────────────────────
if [ -f "$INSTALL_FILE" ]; then
  BACKUP="${INSTALL_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
  echo -e "${YELLOW}[→] Backing up existing template to: ${BACKUP}${NC}"
  cp "$INSTALL_FILE" "$BACKUP"
fi

# ── Download template ────────────────────────
echo -e "${YELLOW}[→] Downloading template from GitHub...${NC}"
echo -e "    ${CYAN}${SOURCE_URL}${NC}"

TMP_FILE=$(mktemp /tmp/sub_XXXXXX.html)

if command -v curl &>/dev/null; then
  HTTP_CODE=$(curl -fsSL -w "%{http_code}" -o "$TMP_FILE" "$SOURCE_URL")
else
  wget -qO "$TMP_FILE" "$SOURCE_URL"
  HTTP_CODE="200"
fi

if [ "$HTTP_CODE" != "200" ] && command -v curl &>/dev/null; then
  echo -e "${RED}[✗] Download failed (HTTP ${HTTP_CODE}).${NC}"
  echo -e "${RED}    Check your GitHub username/repo/branch in install.sh${NC}"
  rm -f "$TMP_FILE"
  exit 1
fi

if [ ! -s "$TMP_FILE" ]; then
  echo -e "${RED}[✗] Downloaded file is empty. Check the source URL.${NC}"
  rm -f "$TMP_FILE"
  exit 1
fi

# ── Verify it looks like an HTML template ───
if ! grep -q "templateVars" "$TMP_FILE"; then
  echo -e "${RED}[✗] Downloaded file doesn't look like a valid 3x-ui template.${NC}"
  rm -f "$TMP_FILE"
  exit 1
fi

# ── Install ──────────────────────────────────
mv "$TMP_FILE" "$INSTALL_FILE"
chmod 644 "$INSTALL_FILE"

# ── Configure 3x-ui to use the template ─────
echo ""
echo -e "${YELLOW}[→] Checking 3x-ui configuration...${NC}"

X_UI_DB="/etc/x-ui/x-ui.db"
X_UI_BIN=$(command -v x-ui 2>/dev/null || echo "")

if [ -n "$X_UI_BIN" ]; then
  echo -e "${GREEN}[✓] x-ui found at: ${X_UI_BIN}${NC}"
else
  echo -e "${YELLOW}[!] x-ui binary not found in PATH. Skipping auto-config.${NC}"
fi

# ── Done ─────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║           Installation Complete!         ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Template installed to:${NC}"
echo -e "  ${BOLD}${INSTALL_FILE}${NC}"
echo ""
echo -e "${CYAN}Next step – enable in 3x-ui panel:${NC}"
echo -e "  1. Open your 3x-ui web panel"
echo -e "  2. Go to  ${BOLD}Panel Settings → Subscription${NC}"
echo -e "  3. Set  ${BOLD}Custom Subscription Page Template${NC}  to:"
echo -e "     ${YELLOW}${INSTALL_FILE}${NC}"
echo -e "  4. Save and restart the panel"
echo ""
echo -e "${GREEN}Done! Kabuti Bando template is live.${NC}"
echo ""
