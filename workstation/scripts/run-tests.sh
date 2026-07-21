#!/bin/sh
set -eu

npm test
npm run report:registries
npm run check:registry-report
npm run check:registry-step-summary
npm run validate:registries:strict
npm run check:registry-audit
