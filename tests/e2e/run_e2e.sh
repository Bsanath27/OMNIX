#!/usr/bin/env bash
# ==============================================================================
# OMNIX Master E2E Test Suite Runner
# Orchestrates all 4 stages of validation:
#   Stage 1: Muon Tickets Validation (CLI)
#   Stage 2: Frontend Compilation & Typechecking (npm run build)
#   Stage 3: Backend Baseline Slide Regression Suite (pytest test_slides.py)
#   Stage 4: 4-Tier Opaque-Box E2E Suite (pytest tests/e2e/ -v)
#
# Returns exit code 0 if all stages succeed; exit code 1 on any failure.
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

# Color codes
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
NC="\033[0m"

echo -e "\n${BOLD}${BLUE}======================================================================${NC}"
echo -e "${BOLD}${CYAN}          OMNIX MASTER 4-TIER E2E TEST RUNNER PIPELINE                ${NC}"
echo -e "${BOLD}${BLUE}======================================================================${NC}\n"

STAGE1_STATUS="PENDING"
STAGE2_STATUS="PENDING"
STAGE3_STATUS="PENDING"
STAGE4_STATUS="PENDING"
OVERALL_STATUS="PASSED"

# ------------------------------------------------------------------------------
# Stage 1: Muon Tickets CLI Validation
# ------------------------------------------------------------------------------
echo -e "${BOLD}${YELLOW}>>> STAGE 1: Muon Ticket CLI Validation${NC}"
echo -e "Command: python3 muontickets/mt.py validate"
if python3 muontickets/mt.py validate; then
    echo -e "${GREEN}✓ Stage 1 Passed: Muon tickets validated.${NC}\n"
    STAGE1_STATUS="PASSED"
else
    echo -e "${RED}✗ Stage 1 Failed: Muon ticket validation failed.${NC}\n"
    STAGE1_STATUS="FAILED"
    OVERALL_STATUS="FAILED"
fi

# ------------------------------------------------------------------------------
# Stage 2: Frontend Build Verification
# ------------------------------------------------------------------------------
echo -e "${BOLD}${YELLOW}>>> STAGE 2: Frontend Build & Typecheck (Vite + TypeScript)${NC}"
echo -e "Command: npm --prefix frontend run build"
if npm --prefix frontend run build; then
    echo -e "${GREEN}✓ Stage 2 Passed: Frontend compiled cleanly with 0 errors.${NC}\n"
    STAGE2_STATUS="PASSED"
else
    echo -e "${RED}✗ Stage 2 Failed: Frontend compilation failed.${NC}\n"
    STAGE2_STATUS="FAILED"
    OVERALL_STATUS="FAILED"
fi

# ------------------------------------------------------------------------------
# Stage 3: Baseline Slide Regression Tests
# ------------------------------------------------------------------------------
echo -e "${BOLD}${YELLOW}>>> STAGE 3: Baseline Slide Regression Test Suite${NC}"
echo -e "Command: PYTHONPATH=. .venv/bin/pytest tests/test_slides.py"
BEFORE_STAGE3_PROJECTS=$(ls -1 data/projects 2>/dev/null || true)
if PYTHONPATH=. .venv/bin/pytest tests/test_slides.py; then
    echo -e "${GREEN}✓ Stage 3 Passed: Baseline slide tests passed with zero regression.${NC}\n"
    STAGE3_STATUS="PASSED"
else
    echo -e "${RED}✗ Stage 3 Failed: Baseline slide tests failed.${NC}\n"
    STAGE3_STATUS="FAILED"
    OVERALL_STATUS="FAILED"
fi
AFTER_STAGE3_PROJECTS=$(ls -1 data/projects 2>/dev/null || true)
comm -13 <(echo "${BEFORE_STAGE3_PROJECTS}" | sort) <(echo "${AFTER_STAGE3_PROJECTS}" | sort) | while read -r leaked_proj; do
    if [ -n "${leaked_proj}" ] && [ -d "data/projects/${leaked_proj}" ]; then
        rm -rf "data/projects/${leaked_proj}"
    fi
done

# ------------------------------------------------------------------------------
# Stage 4: 4-Tier E2E Test Suite
# ------------------------------------------------------------------------------
echo -e "${BOLD}${YELLOW}>>> STAGE 4: 4-Tier E2E Test Suite Execution${NC}"
echo -e "Command: PYTHONPATH=. .venv/bin/pytest tests/e2e/ -v"
if PYTHONPATH=. .venv/bin/pytest tests/e2e/ -v; then
    echo -e "${GREEN}✓ Stage 4 Passed: 4-tier E2E tests passed completely.${NC}\n"
    STAGE4_STATUS="PASSED"
else
    echo -e "${RED}✗ Stage 4 Failed: E2E test failures encountered.${NC}\n"
    STAGE4_STATUS="FAILED"
    OVERALL_STATUS="FAILED"
fi

# ------------------------------------------------------------------------------
# Summary Report
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}${BLUE}======================================================================${NC}"
echo -e "${BOLD}${CYAN}                     E2E PIPELINE EXECUTION SUMMARY                   ${NC}"
echo -e "${BOLD}${BLUE}======================================================================${NC}"
echo -e " Stage 1 (Muon Tickets):      ${STAGE1_STATUS}"
echo -e " Stage 2 (Frontend Build):    ${STAGE2_STATUS}"
echo -e " Stage 3 (Baseline Slides):   ${STAGE3_STATUS}"
echo -e " Stage 4 (4-Tier E2E Suite):  ${STAGE4_STATUS}"
echo -e "----------------------------------------------------------------------"

if [ "${OVERALL_STATUS}" = "PASSED" ]; then
    echo -e "${BOLD}${GREEN} OVERALL STATUS: ALL STAGES PASSED (Exit Code: 0)${NC}"
    echo -e "${BOLD}${BLUE}======================================================================${NC}\n"
    exit 0
else
    echo -e "${BOLD}${RED} OVERALL STATUS: PIPELINE FAILED (Exit Code: 1)${NC}"
    echo -e "${BOLD}${BLUE}======================================================================${NC}\n"
    exit 1
fi
