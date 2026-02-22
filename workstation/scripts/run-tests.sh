#!/bin/sh
set -eu

npm test
npm run validate:registries:strict
npm run report:registries
