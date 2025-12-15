#!/bin/sh
set -e

# Simple helper to execute project tests and registry validation
npm test
npm run verify:registries
