#!/usr/bin/env bash
# ─────────────────────────────────────────────
#  Kabuti Bando – 3x-ui Subscription Template
#  Installer Script
#  Usage: bash <(curl -fsSL https://raw.githubusercontent.com/Kabut27/kabuti/main/install.sh)
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
NC='\033[0m'

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
  DOWNLOADER="curl"
elif command -v wget &>/dev/null; then
  DOWNLOADER="wget"
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

if [ "$DOWNLOADER" = "curl" ]; then
  HTTP_CODE=$(curl -fsSL -w "%{http_code}" -o "$TMP_FILE" "$SOURCE_URL")
  if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}[✗] Download failed (HTTP ${HTTP_CODE}).${NC}"
    rm -f "$TMP_FILE"
    exit 1
  fi
else
  wget -qO "$TMP_FILE" "$SOURCE_URL"
fi

if [ ! -s "$TMP_FILE" ]; then
  echo -e "${RED}[✗] Downloaded file is empty.${NC}"
  rm -f "$TMP_FILE"
  exit 1
fi

# ── Verify it's a valid template ────────────
if ! grep -q "templateVars" "$TMP_FILE"; then
  echo -e "${RED}[✗] File doesn't look like a valid 3x-ui template.${NC}"
  rm -f "$TMP_FILE"
  exit 1
fi

# ── Install ──────────────────────────────────
mv "$TMP_FILE" "$INSTALL_FILE"
chmod 644 "$INSTALL_FILE"

# ── Done ─────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║        Installation Complete! ✓          ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Template installed to:${NC}"
echo -e "  ${BOLD}${INSTALL_FILE}${NC}"
echo ""
echo -e "${CYAN}Next – enable in 3x-ui panel:${NC}"
echo -e "  1. Open your 3x-ui web panel"
echo -e "  2. Go to  ${BOLD}Panel Settings → Subscription${NC}"
echo -e "  3. Set  ${BOLD}Custom Subscription Page Template${NC}  to:"
echo -e "     ${YELLOW}${INSTALL_FILE}${NC}"
echo -e "  4. Save and restart the panel"
echo ""
echo -e "${GREEN}Done! Kabuti Bando template is live.${NC}"
echo ""
